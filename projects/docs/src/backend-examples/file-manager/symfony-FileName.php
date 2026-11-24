<?php
// src/Dto/FileName.php — contrainte composée : nom de fichier ou de dossier (mêmes règles que validateFileName côté client).
namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

#[\Attribute(\Attribute::TARGET_PROPERTY | \Attribute::TARGET_PARAMETER)]
final class FileName extends Assert\Compound
{
    protected function getConstraints(array $options): array
    {
        return [
            new Assert\NotBlank(normalizer: 'trim'),
            new Assert\Length(max: 120),
            new Assert\Regex(pattern: '/[\/\\\\:*?"<>|\x00-\x1F]/', match: false, message: 'Caractères interdits : / \ : * ? " < > |'),
            new Assert\NotIdenticalTo('.'),
            new Assert\NotIdenticalTo('..'),
        ];
    }
}
