<?php
// src/Dto/ChatInput.php — corps de POST /api/chat : { messages: [{ role, content }, …] }.
namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

final class ChatInput
{
    public const int MAX_MESSAGES = 40;
    public const int MAX_MESSAGE_CHARS = 8000;
    public const int MAX_TOTAL_CHARS = 60000;

    /** @param list<ChatMessageInput> $messages */
    public function __construct(
        #[Assert\Count(min: 1, max: self::MAX_MESSAGES)]
        #[Assert\Valid]
        public readonly array $messages = [],
    ) {
    }

    /** Alternance utilisateur / assistant, commence et finit par l'utilisateur, taille totale bornée. */
    #[Assert\Callback]
    public function validateConversation(ExecutionContextInterface $context): void
    {
        $total = 0;
        foreach (array_values($this->messages) as $i => $message) {
            $expected = $i % 2 === 0 ? 'user' : 'assistant';
            if ($message->role !== $expected) {
                $context->buildViolation(\sprintf('« %s » attendu (alternance).', $expected))->atPath("messages[$i].role")->addViolation();

                return;
            }
            $total += mb_strlen($message->content);
        }
        if ($this->messages !== [] && $this->messages[array_key_last($this->messages)]->role !== 'user') {
            $context->buildViolation('Le dernier message doit venir de l’utilisateur.')->atPath('messages')->addViolation();
        }
        if ($total > self::MAX_TOTAL_CHARS) {
            $context->buildViolation('Conversation trop longue : commencez-en une nouvelle.')->atPath('messages')->addViolation();
        }
    }
}
