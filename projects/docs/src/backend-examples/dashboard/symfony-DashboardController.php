<?php
// src/Controller/DashboardController.php — Symfony 7.4 / 8.x.
// CSRF : le CsrfDoubleSubmitSubscriber du secure-skeleton protège déjà toutes les requêtes /api non sûres.
// Taille du corps : JsonBodyLimitSubscriber (avant la lecture du JSON) + serveur web (Nginx : client_max_body_size 64k).
namespace App\Controller;

use App\Dto\DashboardLayoutInput;
use App\Entity\DashboardLayout;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/dashboards/{key}', requirements: ['key' => '[a-z0-9][a-z0-9-]{0,63}'])]
#[IsGranted('ROLE_USER')]
final class DashboardController extends AbstractController
{
    private const array NO_STORE = ['Cache-Control' => 'no-store'];

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    #[Route('', methods: ['GET'])]
    public function show(string $key): JsonResponse
    {
        $layout = $this->findOwned($key);
        if ($layout === null) {
            return $this->json(['error' => 'Aucune disposition enregistrée.'], 404, self::NO_STORE);
        }

        // JsonResponse directe : le Serializer transformerait les réglages vides {} en [].
        return new JsonResponse(
            DashboardLayoutInput::present($layout->getLayout()) + ['updatedAt' => $layout->getUpdatedAt()->format(\DATE_ATOM)],
            200,
            self::NO_STORE,
        );
    }

    #[Route('', methods: ['PUT'])]
    public function save(
        string $key,
        // Champs racine inconnus ignorés (jamais enregistrés : seul toArray() est stocké) ; dans les widgets, refusés.
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: 422)]
        DashboardLayoutInput $input,
    ): JsonResponse {
        $layout = $this->findOwned($key);
        if ($layout === null) {
            // Propriétaire = utilisateur connecté, jamais une valeur envoyée par le client.
            $layout = new DashboardLayout($this->getUser()->getUserIdentifier(), $key, $input->toArray());
            $this->em->persist($layout);
        } else {
            $layout->replace($input->toArray());
        }

        try {
            $this->em->flush();
        } catch (UniqueConstraintViolationException) {
            // Deux premiers enregistrements simultanés : le client renverra la disposition.
            return $this->json(['error' => 'Enregistrement concurrent, réessayez.'], 409);
        }

        return $this->json(['updatedAt' => $layout->getUpdatedAt()->format(\DATE_ATOM)], 200, self::NO_STORE);
    }

    #[Route('', methods: ['DELETE'])]
    public function reset(string $key): Response
    {
        $layout = $this->findOwned($key);
        if ($layout !== null) {
            $this->em->remove($layout);
            $this->em->flush();
        }

        return new Response(null, 204);
    }

    /** Filtre propriétaire dans la requête : une disposition d'un autre utilisateur est introuvable (404). */
    private function findOwned(string $key): ?DashboardLayout
    {
        return $this->em->getRepository(DashboardLayout::class)->findOneBy([
            'owner' => $this->getUser()->getUserIdentifier(),
            'key' => $key,
        ]);
    }
}
