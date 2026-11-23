<?php
// src/Dto/ChatMessageInput.php — un message de l'historique (seuls role et content sont lus).
namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class ChatMessageInput
{
    public function __construct(
        #[Assert\Choice(choices: ['user', 'assistant'])]
        public readonly string $role = '',
        #[Assert\NotBlank(normalizer: 'trim'), Assert\Length(max: ChatInput::MAX_MESSAGE_CHARS)]
        public readonly string $content = '',
    ) {
    }
}
