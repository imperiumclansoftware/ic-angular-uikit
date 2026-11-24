<?php
// src/Dto/RenameInput.php — corps de PATCH /api/files/{id}.
namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class RenameInput
{
    public function __construct(
        #[FileName]
        public readonly string $name = '',
    ) {
    }
}
