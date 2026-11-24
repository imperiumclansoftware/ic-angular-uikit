<?php
// src/Controller/FileController.php — Symfony 7.4 / 8.x. API de la bibliothèque (contrat de uiHttpFileSource).
// CSRF : CsrfDoubleSubmitSubscriber du secure-skeleton. Taille des envois : php.ini (upload_max_filesize 20M,
// post_max_size 21M) et serveur web (Nginx : client_max_body_size 21m).
namespace App\Controller;

use App\Dto\FolderInput;
use App\Dto\IdsInput;
use App\Dto\RenameInput;
use App\Entity\FileNode;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/files')]
#[IsGranted('ROLE_USER')]
final class FileController extends AbstractController
{
    private const int MAX_FILE = 20 * 1024 * 1024;
    private const int QUOTA = 500 * 1024 * 1024;
    /** Types acceptés, détectés dans le contenu (finfo). SVG et HTML exclus (scripts). */
    private const array ALLOWED = [
        'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp', 'image/avif' => 'avif',
        'video/mp4' => 'mp4', 'video/webm' => 'webm', 'audio/mpeg' => 'mp3', 'audio/ogg' => 'ogg', 'application/pdf' => 'pdf',
    ];
    private const array NO_STORE = ['Cache-Control' => 'no-store'];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ValidatorInterface $validator,
        #[Autowire('%kernel.project_dir%/var/files')] private readonly string $storage,
    ) {
    }

    /** Contenu d'un dossier et chemin depuis la racine. */
    #[Route('', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $folderId = $request->query->get('folder');
        $folder = $folderId ? $this->folder($folderId) : null;
        if ($folderId && !$folder) {
            return $this->error('Dossier introuvable.', 404);
        }
        $path = [];
        for ($node = $folder, $depth = 0; $node && $depth < 64; $node = $node->getParent(), $depth++) {
            array_unshift($path, ['id' => $node->getId()->toRfc4122(), 'name' => $node->getName()]);
        }
        $items = array_map(static fn (FileNode $n) => $n->toArray(), $this->children($folder));

        return new JsonResponse(['items' => $items, 'path' => [['id' => null, 'name' => 'Racine'], ...$path]], 200, self::NO_STORE);
    }

    #[Route('/folders', methods: ['POST'])]
    public function createFolder(#[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: 422)] FolderInput $input): JsonResponse
    {
        $parent = $input->parentId ? $this->folder($input->parentId) : null;
        if ($input->parentId && !$parent) {
            return $this->error('Dossier introuvable.', 404);
        }
        $name = trim($input->name);
        if ($this->nameTaken($parent, $name)) {
            return $this->error(\sprintf('« %s » existe déjà dans ce dossier.', $name), 409);
        }
        $folder = new FileNode($this->owner(), $parent, 'folder', $name);
        $this->em->persist($folder);
        $this->em->flush();

        return new JsonResponse($folder->toArray(), 201, self::NO_STORE);
    }

    #[Route('/{id}', methods: ['PATCH'], requirements: ['id' => '[0-9a-f-]{36}'])]
    public function rename(string $id, #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: 422)] RenameInput $input): JsonResponse
    {
        $node = $this->node($id);
        if (!$node) {
            return $this->error('Élément introuvable.', 404);
        }
        $name = trim($input->name);
        if ($this->nameTaken($node->getParent(), $name, $node)) {
            return $this->error(\sprintf('« %s » existe déjà dans ce dossier.', $name), 409);
        }
        $node->rename($name);
        $this->em->flush();

        return new JsonResponse($node->toArray(), 200, self::NO_STORE);
    }

    #[Route('/move', methods: ['POST'])]
    public function move(#[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: 422)] IdsInput $input): Response
    {
        $nodes = $this->nodes($input->ids);
        $target = $input->targetId ? $this->folder($input->targetId) : null;
        if ($nodes === null || ($input->targetId && !$target)) {
            return $this->error('Élément introuvable.', 404);
        }
        // Jamais dans lui-même ni dans un de ses descendants.
        $moved = array_map(static fn (FileNode $n) => $n->getId()->toRfc4122(), $nodes);
        for ($node = $target, $depth = 0; $node && $depth < 64; $node = $node->getParent(), $depth++) {
            if (\in_array($node->getId()->toRfc4122(), $moved, true)) {
                return $this->error('Impossible de déplacer un dossier dans lui-même.', 422);
            }
        }
        foreach ($nodes as $node) {
            if ($this->nameTaken($target, $node->getName(), $node)) {
                return $this->error(\sprintf('« %s » existe déjà dans le dossier de destination.', $node->getName()), 409);
            }
            $node->moveTo($target);
        }
        $this->em->flush();

        return new Response(null, 204);
    }

    #[Route('/delete', methods: ['POST'])]
    public function delete(#[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: 422)] IdsInput $input): Response
    {
        $nodes = $this->nodes($input->ids);
        if ($nodes === null) {
            return $this->error('Élément introuvable.', 404);
        }
        // Tous les descendants sont supprimés explicitement (sans dépendre de ON DELETE CASCADE, que SQLite
        // n'applique pas par défaut), enfants avant parents ; les fichiers du disque sont effacés ensuite.
        $files = [];
        $collect = function (FileNode $node) use (&$collect, &$files): void {
            if ($node->isFolder()) {
                array_map($collect, $this->children($node));
            } else {
                $files[] = $node->getStorageName();
            }
            $this->em->remove($node);
        };
        array_map($collect, $nodes);
        $this->em->flush();
        foreach ($files as $file) {
            @unlink($this->storage.'/'.$file);
        }

        return new Response(null, 204);
    }

    #[Route('/upload', methods: ['POST'])]
    public function upload(Request $request): JsonResponse
    {
        if ((int) $request->headers->get('Content-Length', '0') > self::MAX_FILE + 1024 * 1024) {
            return $this->error('Fichier trop volumineux (20 Mo au plus).', 413);
        }
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile || !$file->isValid()) {
            return $this->error($file instanceof UploadedFile && \in_array($file->getError(), [\UPLOAD_ERR_INI_SIZE, \UPLOAD_ERR_FORM_SIZE], true) ? 'Fichier trop volumineux (20 Mo au plus).' : 'Aucun fichier.', $file instanceof UploadedFile ? 413 : 400);
        }
        $folderId = $request->request->get('folder');
        $parent = $folderId ? $this->folder((string) $folderId) : null;
        if ($folderId && !$parent) {
            return $this->error('Dossier introuvable.', 404);
        }
        // Type réel lu dans le contenu (finfo), taille maximale.
        $violations = $this->validator->validate($file, new Assert\File(maxSize: self::MAX_FILE, mimeTypes: array_keys(self::ALLOWED)));
        if (\count($violations) > 0) {
            return $file->getSize() > self::MAX_FILE ? $this->error('Fichier trop volumineux (20 Mo au plus).', 413) : $this->error('Type de fichier non accepté.', 415);
        }
        $mime = (string) $file->getMimeType();
        $used = (int) $this->em->createQuery('SELECT COALESCE(SUM(n.size), 0) FROM App\Entity\FileNode n WHERE n.owner = :owner')->setParameter('owner', $this->owner())->getSingleScalarResult();
        if ($used + $file->getSize() > self::QUOTA) {
            return $this->error('Espace de stockage plein.', 413);
        }
        // Nom d'origine nettoyé, extension du type réel, rendu unique dans le dossier.
        $base = preg_replace('/[\/\\\\:*?"<>|\x00-\x1F]/', '', pathinfo($file->getClientOriginalName(), \PATHINFO_FILENAME)) ?: 'fichier';
        $base = mb_substr(trim($base), 0, 100) ?: 'fichier';
        $ext = self::ALLOWED[$mime];
        $name = "$base.$ext";
        for ($n = 2; $this->nameTaken($parent, $name); $n++) {
            $name = "$base ($n).$ext";
        }
        $node = new FileNode($this->owner(), $parent, 'file', $name, $mime, $file->getSize());
        $file->move($this->storage, $node->getStorageName());
        $this->em->persist($node);
        $this->em->flush();

        return new JsonResponse($node->toArray(), 201, self::NO_STORE);
    }

    /** Contenu : propriétaire seulement ; images / vidéos / audio affichés, le reste téléchargé. Plages (Range) gérées. */
    #[Route('/{id}/content', methods: ['GET'], requirements: ['id' => '[0-9a-f-]{36}'])]
    public function content(string $id): Response
    {
        $node = $this->node($id);
        if (!$node || $node->isFolder() || !is_file($this->storage.'/'.$node->getStorageName())) {
            return $this->error('Fichier introuvable.', 404);
        }
        $response = new BinaryFileResponse($this->storage.'/'.$node->getStorageName());
        $response->headers->set('Content-Type', (string) $node->getMimeType());
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Content-Security-Policy', "default-src 'none'; sandbox");
        $response->setPrivate();
        $response->setMaxAge(300);
        $inline = preg_match('#^(image|video|audio)/#', (string) $node->getMimeType()) === 1;
        $response->setContentDisposition($inline ? ResponseHeaderBag::DISPOSITION_INLINE : ResponseHeaderBag::DISPOSITION_ATTACHMENT, $node->getName(), 'fichier');

        return $response;
    }

    private function owner(): string
    {
        return $this->getUser()->getUserIdentifier();
    }

    /** Élément de l'utilisateur (identifiant invalide, inconnu ou à un autre : null). */
    private function node(string $id): ?FileNode
    {
        if (!Uuid::isValid($id)) {
            return null;
        }
        return $this->em->getRepository(FileNode::class)->findOneBy(['id' => Uuid::fromString($id), 'owner' => $this->owner()]);
    }

    private function folder(string $id): ?FileNode
    {
        $node = $this->node($id);
        return $node?->isFolder() ? $node : null;
    }

    /** @param list<string> $ids @return list<FileNode>|null */
    private function nodes(array $ids): ?array
    {
        $nodes = [];
        foreach (array_unique($ids) as $id) {
            $node = $this->node($id);
            if (!$node) {
                return null;
            }
            $nodes[] = $node;
        }
        return $nodes;
    }

    /** @return list<FileNode> */
    private function children(?FileNode $folder): array
    {
        return $this->em->getRepository(FileNode::class)->findBy(['owner' => $this->owner(), 'parent' => $folder], ['kind' => 'DESC', 'nameKey' => 'ASC']);
    }

    private function nameTaken(?FileNode $parent, string $name, ?FileNode $except = null): bool
    {
        $found = $this->em->getRepository(FileNode::class)->findOneBy(['owner' => $this->owner(), 'parent' => $parent, 'nameKey' => FileNode::key($name)]);
        return $found !== null && $found !== $except;
    }

    private function error(string $message, int $status): JsonResponse
    {
        return new JsonResponse(['error' => $message], $status, self::NO_STORE);
    }
}
