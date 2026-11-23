<?php
// src/EventSubscriber/JsonBodyLimitSubscriber.php — refuse les corps JSON trop gros AVANT leur lecture
// (#[MapRequestPayload] décode et valide le JSON avant d'entrer dans le contrôleur).
namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

final class JsonBodyLimitSubscriber implements EventSubscriberInterface
{
    private const int MAX_BYTES = 65536;
    /** Routes concernées (ajoutez les vôtres). */
    private const array PREFIXES = ['/api/comments', '/api/dashboards/'];

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::REQUEST => ['onRequest', 16]];
    }

    private function isLimited(string $path): bool
    {
        foreach (self::PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return true;
            }
        }
        return false;
    }

    public function onRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();
        if (!$event->isMainRequest() || !$this->isLimited($request->getPathInfo())
            || !\in_array($request->getMethod(), ['POST', 'PUT', 'PATCH'], true)) {
            return;
        }
        // Content-Length annoncé, puis taille réelle (requêtes « chunked » sans en-tête).
        if ((int) $request->headers->get('Content-Length', '0') > self::MAX_BYTES || \strlen($request->getContent()) > self::MAX_BYTES) {
            $event->setResponse(new JsonResponse(['error' => 'Contenu trop volumineux.'], 413));
        }
    }
}
