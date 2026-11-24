<?php
// src/Entity/FileNode.php — dossier ou fichier de la bibliothèque d'un utilisateur.
namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'file_node')]
#[ORM\Index(name: 'file_node_owner_parent', columns: ['owner', 'parent_id'])]
class FileNode
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $modifiedAt;

    /** Nom en minuscules : unicité insensible à la casse dans un dossier. */
    #[ORM\Column(length: 120)]
    private string $nameKey;

    public function __construct(
        #[ORM\Column(length: 180)]
        private string $owner,
        #[ORM\ManyToOne(targetEntity: self::class)]
        #[ORM\JoinColumn(onDelete: 'CASCADE')]
        private ?FileNode $parent,
        #[ORM\Column(length: 6)]
        private string $kind,
        #[ORM\Column(length: 120)]
        private string $name,
        #[ORM\Column(length: 100, nullable: true)]
        private ?string $mimeType = null,
        #[ORM\Column(nullable: true)]
        private ?int $size = null,
    ) {
        $this->id = Uuid::v7();
        $this->nameKey = self::key($name);
        $this->modifiedAt = new \DateTimeImmutable();
    }

    public static function key(string $name): string
    {
        return mb_strtolower(\Normalizer::normalize($name, \Normalizer::FORM_C) ?: $name);
    }

    public function getId(): Uuid { return $this->id; }
    public function getOwner(): string { return $this->owner; }
    public function getParent(): ?self { return $this->parent; }
    public function getName(): string { return $this->name; }
    public function getNameKey(): string { return $this->nameKey; }
    public function getMimeType(): ?string { return $this->mimeType; }
    public function getSize(): ?int { return $this->size; }
    public function isFolder(): bool { return $this->kind === 'folder'; }
    /** Nom du fichier stocké : l'UUID, jamais le nom envoyé. */
    public function getStorageName(): string { return $this->id->toRfc4122(); }

    public function rename(string $name): void
    {
        $this->name = $name;
        $this->nameKey = self::key($name);
        $this->modifiedAt = new \DateTimeImmutable();
    }

    public function moveTo(?self $parent): void
    {
        $this->parent = $parent;
        $this->modifiedAt = new \DateTimeImmutable();
    }

    /** Forme JSON attendue par uiHttpFileSource (UiFileEntry). */
    public function toArray(): array
    {
        $entry = ['id' => $this->id->toRfc4122(), 'name' => $this->name, 'kind' => $this->kind, 'modifiedAt' => $this->modifiedAt->format(\DATE_ATOM)];
        if (!$this->isFolder()) {
            $url = '/api/files/'.$this->id->toRfc4122().'/content';
            $entry += ['mimeType' => $this->mimeType, 'size' => $this->size, 'url' => $url];
            if (str_starts_with((string) $this->mimeType, 'image/')) {
                $entry['thumbnailUrl'] = $url;
            }
        }
        return $entry;
    }
}
