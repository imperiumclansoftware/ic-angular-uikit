<?php
// src/Controller/ChatController.php — Symfony 7.4 / 8.x, SDK officiel Anthropic (anthropic-ai/sdk).
// CSRF : le CsrfDoubleSubmitSubscriber du secure-skeleton protège déjà toutes les requêtes /api non sûres.
// Taille du corps : JsonBodyLimitSubscriber (avant la lecture du JSON) + serveur web (Nginx : client_max_body_size 256k).
namespace App\Controller;

use Anthropic\Beta\Messages\BetaRawContentBlockDeltaEvent;
use Anthropic\Beta\Messages\BetaRawMessageDeltaEvent;
use Anthropic\Beta\Messages\BetaTextDelta;
use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIException;
use Anthropic\Core\Exceptions\RateLimitException;
use App\Dto\ChatInput;
use App\Dto\ChatMessageInput;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_USER')]
final class ChatController extends AbstractController
{
    /** Consignes de l'assistant : définies côté serveur, jamais reçues du navigateur. */
    private const string SYSTEM_PROMPT = <<<'TXT'
        Tu es l'assistant du site. Réponds en français, de façon concise et exacte.
        Mets en forme avec du Markdown simple (listes, tableaux, blocs de code). Si tu ne sais pas, dis-le.
        TXT;

    public function __construct(
        private readonly Client $anthropic,
        private readonly RateLimiterFactoryInterface $chatLimiter, // config/packages/rate_limiter.yaml
        private readonly LoggerInterface $logger,
    ) {
    }

    #[Route('/api/chat', methods: ['POST'])]
    public function chat(#[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: 422)] ChatInput $input): Response
    {
        $limit = $this->chatLimiter->create($this->getUser()->getUserIdentifier())->consume();
        if (!$limit->isAccepted()) {
            return $this->json(['error' => 'Trop de demandes : réessayez dans un instant.'], 429, [
                'Retry-After' => (string) max(1, $limit->getRetryAfter()->getTimestamp() - time()),
            ]);
        }

        // Champs connus uniquement : le texte et le rôle validés par le DTO.
        $messages = array_map(
            static fn (ChatMessageInput $m): array => ['role' => $m->role, 'content' => $m->content],
            array_values($input->messages),
        );

        // Réponse en flux NDJSON : une ligne JSON par morceau ({"text":…}), {"error":…} en cas de problème.
        $response = new StreamedResponse(function () use ($messages): void {
            $send = static function (array $line): void {
                echo json_encode($line, \JSON_UNESCAPED_UNICODE | \JSON_THROW_ON_ERROR), "\n";
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            };
            ignore_user_abort(true); // on détecte nous-mêmes la déconnexion pour fermer proprement l'appel à l'API

            try {
                $stream = $this->anthropic->beta->messages->createStream(
                    maxTokens: 8192, // plafond de coût par réponse ; à relever pour des réponses longues
                    messages: $messages,
                    model: 'claude-opus-5-5',
                    system: self::SYSTEM_PROMPT,
                    outputConfig: ['effort' => 'medium'], // « low » suffit souvent pour une discussion simple
                    // Si le modèle décline une demande pour raison de politique, l'API la rejoue sur le modèle de repli prévu.
                    fallbacks: 'default',
                    betas: ['server-side-fallback-2026-07-01'],
                );
                $stopReason = null;
                foreach ($stream as $event) {
                    if ($event instanceof BetaRawContentBlockDeltaEvent && $event->delta instanceof BetaTextDelta) {
                        $send(['text' => $event->delta->text]);
                    } elseif ($event instanceof BetaRawMessageDeltaEvent) {
                        $stopReason = $event->delta->stopReason ?? $stopReason;
                    }
                    // Bouton « Arrêter » ou onglet fermé : la requête à l'API est fermée (plus de jetons facturés).
                    if (connection_aborted()) {
                        $stream->close();

                        return;
                    }
                }
                if ($stopReason === 'refusal') {
                    $send(['error' => 'L’assistant ne peut pas répondre à cette demande.']);
                } elseif ($stopReason === 'max_tokens') {
                    $send(['error' => 'Réponse tronquée : longueur maximale atteinte.']);
                }
            } catch (RateLimitException) {
                $send(['error' => 'Le service d’IA est saturé : réessayez dans un instant.']);
            } catch (APIConnectionException $e) {
                $this->logger->error('chat: API injoignable', ['exception' => $e]);
                $send(['error' => 'Le service d’IA est injoignable.']);
            } catch (APIException $e) {
                // Détail côté serveur uniquement ; jamais le contenu des messages dans les journaux.
                $this->logger->error('chat: erreur API', ['exception' => $e]);
                $send(['error' => 'Le service d’IA a renvoyé une erreur.']);
            }
        });
        $response->headers->set('Content-Type', 'application/x-ndjson; charset=utf-8');
        $response->headers->set('Cache-Control', 'no-store');
        $response->headers->set('X-Accel-Buffering', 'no'); // Nginx : ne pas mettre le flux en tampon
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }
}
