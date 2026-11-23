<?php
// src/Entity/Document.php — métadonnées du fichier ; le fichier lui-même est dans var/uploads/{id}.
namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Index(columns: ['owner'])]
class Document
{
    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        #[ORM\Id, ORM\Column(type: UuidType::NAME, unique: true)]
        private Uuid $id,
        /** Identifiant de l'utilisateur propriétaire (ou relation ManyToOne vers User). */
        #[ORM\Column(length: 180)]
        private string $owner,
        /** Nom d'origine, uniquement pour l'affichage et le téléchargement ; jamais utilisé comme chemin. */
        #[ORM\Column(length: 255)]
        private string $name,
        #[ORM\Column]
        private int $size,
        /** Type MIME réel, détecté sur le contenu. */
        #[ORM\Column(length: 100)]
        private string $type,
    ) {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getOwner(): string { return $this->owner; }
    public function getName(): string { return $this->name; }
    public function getSize(): int { return $this->size; }
    public function getType(): string { return $this->type; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
