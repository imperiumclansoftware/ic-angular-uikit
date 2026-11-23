<?php
// src/Dto/CommentInput.php — corps de POST /api/comments.
namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class CommentInput
{
    public function __construct(
        #[Assert\NotBlank, Assert\Length(max: 65536)]
        public readonly string $content = '',
    ) {
    }
}
