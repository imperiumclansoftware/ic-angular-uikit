<?php
// src/Controller/UploadController.php — Symfony 7.4 / 8.x.
// CSRF : le CsrfDoubleSubmitSubscriber du secure-skeleton protège déjà toutes les requêtes /api non sûres.
// php.ini : upload_max_filesize = 5M, post_max_size = 6M
namespace App\Controller;

use App\Entity\Document;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/uploads')]
#[IsGranted('ROLE_USER')]
final class UploadController extends AbstractController
{
    private const int MAX_BYTES = 5 * 1024 * 1024;
    /** Extension → type MIME réel attendu (vérifié sur le contenu). SVG et HTML exclus. */
    private const array EXTENSIONS = [
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'pdf' => 'application/pdf',
    ];

    public function __construct(
        #[Autowire('%kernel.project_dir%/var/uploads')] private readonly string $uploadDir,
        private readonly ValidatorInterface $validator,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[Route('', methods: ['POST'])]
    public function upload(Request $request): JsonResponse
    {
        if ((int) $request->headers->get('Content-Length', '0') > self::MAX_BYTES + 1024 * 1024) {
            return $this->json(['error' => 'Fichier trop volumineux (5 Mo max).'], 413);
        }
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile) {
            return $this->json(['error' => 'Aucun fichier reçu (champ « file »).'], 400);
        }
        if (!$file->isValid()) {
            $tooLarge = \in_array($file->getError(), [\UPLOAD_ERR_INI_SIZE, \UPLOAD_ERR_FORM_SIZE], true);
            return $this->json(['error' => $tooLarge ? 'Fichier trop volumineux (5 Mo max).' : 'Envoi invalide.'], $tooLarge ? 413 : 400);
        }

        // Taille, extension ET type réel (fileinfo sur le contenu) : la contrainte vérifie la cohérence des deux.
        $violations = $this->validator->validate($file, new Assert\File(maxSize: '5M', extensions: self::EXTENSIONS));
        if (\count($violations) > 0) {
            $status = match ($violations[0]->getCode()) {
                Assert\File::TOO_LARGE_ERROR => 413,
                Assert\File::EMPTY_ERROR => 400,
                default => 415,
            };
            return $this->json(['error' => $status === 415 ? 'Type de fichier non autorisé.' : $violations[0]->getMessage()], $status);
        }

        $id = Uuid::v7(); // nom de stockage : jamais le nom d'origine
        $type = (string) $file->getMimeType();
        $size = (int) $file->getSize();
        $name = mb_substr((string) preg_replace('/[\x00-\x1F\x7F]/u', '', $file->getClientOriginalName()), 0, 255);
        $file->move($this->uploadDir, $id->toRfc4122());
        chmod($this->uploadDir.'/'.$id->toRfc4122(), 0600);

        $this->em->persist(new Document($id, $this->getUser()->getUserIdentifier(), $name, $size, $type));
        $this->em->flush();

        return $this->json(['id' => $id->toRfc4122(), 'name' => $name, 'size' => $size, 'type' => $type], 201);
    }

    /** Téléchargement : filtré sur le propriétaire dans la requête, en pièce jointe, sans interprétation. */
    #[Route('/{id}', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function download(string $id): BinaryFileResponse
    {
        $document = $this->em->getRepository(Document::class)->findOneBy([
            'id' => Uuid::fromString($id),
            'owner' => $this->getUser()->getUserIdentifier(),
        ]) ?? throw $this->createNotFoundException(); // 404 plutôt que 403 : ne révèle pas l'existence

        $response = new BinaryFileResponse($this->uploadDir.'/'.$document->getId()->toRfc4122());
        $response->headers->set('Content-Type', $document->getType());
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Cache-Control', 'private, no-store');
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $document->getName(), 'document');

        return $response;
    }
}
