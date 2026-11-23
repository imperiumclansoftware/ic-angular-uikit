<?php
// src/Entity/Comment.php — commentaire en texte riche (HTML déjà nettoyé par le serveur).
namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Index(columns: ['owner'])]
class Comment
{
    #[ORM\Id, ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        /** Identifiant de l'utilisateur (ou relation ManyToOne vers User). Jamais lu depuis la requête. */
        #[ORM\Column(length: 180)]
        private string $owner,
        /** HTML nettoyé par le sanitizer : seul ce contenu est enregistré et réaffiché. */
        #[ORM\Column(type: Types::TEXT)]
        private string $content,
    ) {
        $this->id = Uuid::v7();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getContent(): string { return $this->content; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
