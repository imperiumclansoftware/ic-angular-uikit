<?php
// src/Dto/FolderInput.php — corps de POST /api/files/folders.
namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class FolderInput
{
    public function __construct(
        #[Assert\Uuid]
        public readonly ?string $parentId = null,
        #[FileName]
        public readonly string $name = '',
    ) {
    }
}
