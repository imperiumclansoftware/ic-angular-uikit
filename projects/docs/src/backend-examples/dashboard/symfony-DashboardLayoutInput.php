<?php
// src/Dto/DashboardLayoutInput.php — corps de PUT /api/dashboards/{key}, validé avant tout enregistrement.
namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

final class DashboardLayoutInput
{
    /** Types de widgets connus de l'application (liste blanche). */
    public const array WIDGET_TYPES = ['kpi', 'chart', 'tasks', 'note', 'goal'];
    private const int MAX_CONFIG_BYTES = 8192;

    public function __construct(
        #[Assert\IdenticalTo(1)]
        public readonly int $version,
        #[Assert\Range(min: 1, max: 24)]
        public readonly int $columns,
        /** @var list<array<string, mixed>> */
        #[Assert\Count(max: 50)]
        #[Assert\All([
            new Assert\Collection(
                fields: [
                    'id' => [new Assert\Type('string'), new Assert\Regex('/^[A-Za-z0-9_-]{1,64}$/')],
                    'type' => [new Assert\Type('string'), new Assert\Choice(choices: self::WIDGET_TYPES)],
                    'x' => [new Assert\Type('int'), new Assert\Range(min: 0, max: 23)],
                    'y' => [new Assert\Type('int'), new Assert\Range(min: 0, max: 1000)],
                    'w' => [new Assert\Type('int'), new Assert\Range(min: 1, max: 24)],
                    'h' => [new Assert\Type('int'), new Assert\Range(min: 1, max: 50)],
                    'title' => new Assert\Optional([
                        new Assert\Type('string'),
                        new Assert\Length(max: 120),
                        new Assert\Regex(pattern: '/[\x00-\x1F\x7F]/', match: false, message: 'Caractères de contrôle interdits.'),
                    ]),
                    'config' => new Assert\Optional([new Assert\Type('array')]),
                ],
                allowExtraFields: false,
            ),
        ])]
        public readonly array $items = [],
    ) {
    }

    /** Règles qui portent sur plusieurs champs : identifiants uniques, largeur dans la grille, taille des réglages. */
    #[Assert\Callback]
    public function validateItems(ExecutionContextInterface $context): void
    {
        $ids = [];
        foreach ($this->items as $i => $item) {
            if (!\is_array($item)) {
                continue; // déjà signalé par Assert\All
            }
            $id = $item['id'] ?? null;
            if (\is_string($id) && isset($ids[$id])) {
                $context->buildViolation('Identifiant en double.')->atPath("items[$i][id]")->addViolation();
            }
            $ids[(string) $id] = true;
            if (\is_int($item['x'] ?? null) && \is_int($item['w'] ?? null) && $item['x'] + $item['w'] > $this->columns) {
                $context->buildViolation('Le widget dépasse de la grille.')->atPath("items[$i][w]")->addViolation();
            }
            if (\array_key_exists('config', $item)) {
                $config = $item['config'];
                // Un objet JSON (tableau associatif), profondeur 5 au plus, 8 Ko au plus une fois encodé.
                $encoded = \is_array($config) && ($config === [] || !array_is_list($config)) ? json_encode($config, 0, 5) : false;
                if ($encoded === false || \strlen($encoded) > self::MAX_CONFIG_BYTES) {
                    $context->buildViolation('Réglages invalides (objet JSON, 8 Ko et 5 niveaux au plus).')->atPath("items[$i][config]")->addViolation();
                }
            }
        }
    }

    /** Disposition normalisée à enregistrer (uniquement les champs connus). */
    public function toArray(): array
    {
        return self::present([
            'version' => 1,
            'columns' => $this->columns,
            'items' => array_map(
                static fn (array $item): array => array_intersect_key($item, array_flip(['id', 'type', 'x', 'y', 'w', 'h', 'title', 'config'])),
                $this->items,
            ),
        ]);
    }

    /** Réglages vides réencodés en `{}` et non `[]` (PHP ne distingue pas un objet vide d'un tableau vide). */
    public static function present(array $layout): array
    {
        foreach ($layout['items'] ?? [] as $i => $item) {
            if (\is_array($item) && ($item['config'] ?? null) === []) {
                $layout['items'][$i]['config'] = new \stdClass();
            }
        }
        return $layout;
    }
}
