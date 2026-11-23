<?php
// src/Controller/CommentController.php — Symfony 7.4 / 8.x.
// CSRF : le CsrfDoubleSubmitSubscriber du secure-skeleton protège déjà toutes les requêtes /api non sûres.
// Taille du corps : JsonBodyLimitSubscriber (avant la lecture du JSON) + serveur web (Nginx : client_max_body_size 64k).
namespace App\Controller;

use App\Dto\CommentInput;
use App\Entity\Comment;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/comments')]
#[IsGranted('ROLE_USER')]
final class CommentController extends AbstractController
{
    /** Longueur maximale du texte visible (sans balises). */
    private const int MAX_TEXT = 5000;
    private const array NO_STORE = ['Cache-Control' => 'no-store'];

    public function __construct(
        private readonly EntityManagerInterface $em,
        #[Target('app.rich_text_sanitizer')] private readonly HtmlSanitizerInterface $sanitizer,
    ) {
    }

    #[Route('', methods: ['POST'])]
    public function create(#[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: 422)] CommentInput $input): JsonResponse
    {
        // Le HTML vient du navigateur : il est TOUJOURS nettoyé ici, même si l'éditeur l'a déjà fait.
        $html = $this->sanitizer->sanitize($input->content);
        $text = trim(html_entity_decode(strip_tags($html), \ENT_QUOTES | \ENT_HTML5, 'UTF-8'), " \t\n\r\0\x0B\u{A0}");
        if ($text === '') {
            return $this->json(['error' => 'Le commentaire est vide.'], 422);
        }
        if (mb_strlen($text) > self::MAX_TEXT) {
            return $this->json(['error' => \sprintf('%d caractères au plus.', self::MAX_TEXT)], 422);
        }

        // Propriétaire = utilisateur connecté, jamais une valeur envoyée par le client.
        $comment = new Comment($this->getUser()->getUserIdentifier(), $html);
        $this->em->persist($comment);
        $this->em->flush();

        return $this->json(['id' => $comment->getId()->toRfc4122(), 'content' => $html], 201, self::NO_STORE);
    }

    /** Commentaires de l'utilisateur connecté (filtre propriétaire dans la requête). */
    #[Route('', methods: ['GET'])]
    public function mine(): JsonResponse
    {
        $comments = $this->em->getRepository(Comment::class)->findBy(
            ['owner' => $this->getUser()->getUserIdentifier()],
            ['createdAt' => 'DESC'],
            50,
        );

        return $this->json(array_map(static fn (Comment $c) => [
            'id' => $c->getId()->toRfc4122(),
            'content' => $c->getContent(),
            'createdAt' => $c->getCreatedAt()->format(\DATE_ATOM),
        ], $comments), 200, self::NO_STORE);
    }
}
