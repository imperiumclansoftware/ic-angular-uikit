<?php
// src/Entity/DashboardLayout.php — une disposition par utilisateur et par tableau de bord (clé « accueil », « ventes »…).
namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'dashboard_layout')]
#[ORM\UniqueConstraint(name: 'uniq_dashboard_owner_key', columns: ['owner', 'dashboard_key'])]
class DashboardLayout
{
    #[ORM\Id, ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(
        /** Identifiant de l'utilisateur propriétaire (ou relation ManyToOne vers User). Jamais lu depuis la requête. */
        #[ORM\Column(length: 180)]
        private string $owner,
        #[ORM\Column(name: 'dashboard_key', length: 64)]
        private string $key,
        /** Disposition validée : { version, columns, items }. */
        #[ORM\Column(type: Types::JSON)]
        private array $layout,
    ) {
        $this->id = Uuid::v7();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function replace(array $layout): void
    {
        $this->layout = $layout;
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getLayout(): array { return $this->layout; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
