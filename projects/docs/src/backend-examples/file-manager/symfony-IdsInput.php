<?php
// src/Dto/IdsInput.php — corps de POST /api/files/move et /api/files/delete.
namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class IdsInput
{
    /** @param list<string> $ids */
    public function __construct(
        #[Assert\Count(min: 1, max: 500)]
        #[Assert\All([new Assert\Uuid()])]
        public readonly array $ids = [],
        #[Assert\Uuid]
        public readonly ?string $targetId = null,
    ) {
    }
}
