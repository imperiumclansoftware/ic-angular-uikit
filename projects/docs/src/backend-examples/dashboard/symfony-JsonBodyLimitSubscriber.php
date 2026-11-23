<?php
// src/EventSubscriber/JsonBodyLimitSubscriber.php — refuse les corps trop gros AVANT leur lecture
// (#[MapRequestPayload] décode et valide le JSON avant d'entrer dans le contrôleur).
namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

final class JsonBodyLimitSubscriber implements EventSubscriberInterface
{
    private const int MAX_BYTES = 65536;

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::REQUEST => ['onRequest', 16]];
    }

    public function onRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();
        if (!$event->isMainRequest() || !str_starts_with($request->getPathInfo(), '/api/dashboards/')
            || !\in_array($request->getMethod(), ['POST', 'PUT', 'PATCH'], true)) {
            return;
        }
        // Content-Length annoncé, puis taille réelle (requêtes « chunked » sans en-tête).
        if ((int) $request->headers->get('Content-Length', '0') > self::MAX_BYTES || \strlen($request->getContent()) > self::MAX_BYTES) {
            $event->setResponse(new JsonResponse(['error' => 'Disposition trop volumineuse.'], 413));
        }
    }
}
