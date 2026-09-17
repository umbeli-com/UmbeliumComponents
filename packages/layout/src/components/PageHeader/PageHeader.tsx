import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/layout/styles

/** Balise du titre. `h1` = défaut historique. */
export type PageHeaderTitleTag = 'h1' | 'h2' | 'h3';

/**
 * En-tête de page canonique de la suite.
 *
 * Version d'origine : `title: string`, aucune échappatoire de style, actions
 * toujours enfouies dans `__meta > __actions`. Les trois apps qui la refusaient
 * ne rendaient pas ça — elles rendaient des titres COMPOSITES, un `style`
 * inline sur la racine, des actions en ENFANTS DIRECTS, et leur propre
 * typographie. Refus mesurés, fichier par fichier :
 *
 *   Webum    apps/admin/src/pages/SiteSettings.tsx:155      <Settings/> dans le h1
 *   Webum    apps/admin/src/pages/Submissions.tsx:74        badge « N nouveaux »
 *   Webum    apps/admin/src/pages/EntryEdit.tsx:103-112     lien retour + h1 à l'ellipse
 *   Webum    apps/admin/src/pages/CollectionEntries.tsx:71  lien retour + actions directes
 *   Webum    apps/admin/src/styles.css:387-404              .page-header maison
 *                                                           (row+wrap à TOUTE largeur,
 *                                                            h1 22px, `> div` mobile)
 *   Webum    11 des 22 en-têtes portent style={{ marginBottom: 8|24 }}
 *   Profilum profilum/src/pages/Contacts.jsx:140-141        h2.app-title + sous-titre 54ch
 *   Profilum profilum/src/styles/_base.scss:86              h2 = clamp(…, 2.15rem) = 34.4px
 *   Profilum profilum/src/styles/_base.scss:20 + :147       muted #94A3B8 vs token #6b7280
 *   Profilum frontend/src/styles/base/_layout.scss:42       __actions en enfant direct
 *   Servum   apps/web/src/styles/main.scss:264-270          .dashboard-header, h1 24px
 *
 * Refus suivant, mesuré à l'adoption (Webum ×3, Profilum ×2) : le lien
 * « retour » vit HORS du `<h1>`, avant lui — aucune prop ne l'atteignait.
 * D'où `leading` (+ `unstyledTitleRow`, `titleRowClassName`, `titleRowStyle`).
 *
 * Tout ce qui suit est ADDITIF : sans nouvelle prop, le balisage est celui
 * d'hier à l'octet près (mêmes balises, mêmes classes, même ordre, aucun
 * attribut en plus — `__meta` reste émis même vide) et la feuille rend les
 * mêmes valeurs calculées.
 */
export interface PageHeaderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /**
   * ÉLARGI de `string` à `ReactNode` : `string` reste valide, donc aucun
   * appelant existant ne casse. Permet l'icône dans le h1 (Webum SiteSettings),
   * le badge inline (Webum Submissions) et le lien retour (Webum EntryEdit).
   * Devenu optionnel — un en-tête qui n'a que des actions est un cas réel
   * (Webum Editor). `undefined`/`null`/`false`/`true` n'émettent PAS de `<h1>`
   * vide — `false` compris, c'est lui que produit `title={cond && <X/>}`.
   * Tout ça était inatteignable avant (`title` requis et typé `string`).
   * `''` émet un `<h1>` vide, comme hier.
   */
  title?: ReactNode;
  /**
   * Élargi de `string` à `ReactNode`. Vide/absent : rien n'est rendu
   * (inchangé). `0` rend bien `<p>0</p>` et non un « 0 » nu — voir
   * `isRenderable`.
   */
  subtitle?: ReactNode;
  /** Élargi de `string` à `ReactNode`. Même garde que `subtitle`. */
  period?: ReactNode;
  actions?: ReactNode;
  /**
   * Balise du titre (défaut `h1`). Profilum rend un `<h2 class="app-title">` :
   * son `h2 { font-family: serif; font-size: clamp(…) }` ne s'applique qu'à un
   * vrai `h2`.
   */
  titleAs?: PageHeaderTitleTag;
  /**
   * Rend période et actions en ENFANTS DIRECTS de la racine, sans le wrapper
   * `__meta` — la forme qu'ont déjà Webum (EntryEdit:103, CollectionEntries:71)
   * et Profilum (`.page-header > .page-header__actions`).
   *
   * ATTENTION, documenté exprès : la racine a alors DEUX enfants `<div>`
   * (contenu + actions), donc la règle mobile de Webum
   * `.page-header > div { flex: 1 1 100% }` (styles.css:402) en vise deux.
   * C'est exactement ce que Webum rend AUJOURD'HUI sur ces deux pages — la
   * règle y frappe déjà les deux div. Ce n'est donc pas une régression, mais
   * une page dont les actions ne sont pas un `<div>` (Dashboard.tsx:90 rend un
   * `<Link>` nu) verra ses boutons passer pleine largeur sous 480px.
   */
  flatActions?: boolean;
  /**
   * N'émet PAS `umb-page-header__title` : la feuille du paquet ne peut plus
   * atteindre le titre, la peau de l'app reprend la main sans `!important` ni
   * guerre d'ordre source. `page-header__title` (historique) reste émise —
   * c'est elle que cible la feuille de Profilum/frontend.
   * Alternative plus fine : les tokens `--umb-page-header-title-*`.
   */
  unstyledTitle?: boolean;
  /** Idem pour le sous-titre (n'émet pas `umb-page-header__subtitle`). */
  unstyledSubtitle?: boolean;
  /** Ajoutée aux classes de la racine (jamais en remplacement). */
  className?: string;
  /**
   * Transmis à la racine. 11 des 22 en-têtes de Webum portent
   * `style={{ marginBottom: 8|24 }}` ; sans ça, irreproductible.
   * Accepte aussi les tokens `--umb-page-header-*` (voir PageHeader.scss).
   */
  style?: CSSProperties;
  /** Ajoutée aux classes du titre (ex. `app-title` de Profilum). */
  titleClassName?: string;
  /** Transmis au titre (ex. l'ellipse de Webum EntryEdit:104). */
  titleStyle?: CSSProperties;
  /** Ajoutée aux classes du sous-titre. */
  subtitleClassName?: string;
  /** Transmis au sous-titre (ex. `maxWidth: '54ch'` de Profilum Contacts:141). */
  subtitleStyle?: CSSProperties;
  /**
   * Fente AVANT le titre, HORS de la balise de titre : le lien « retour » de
   * Webum (EntryEdit.tsx:105, CollectionEntries.tsx:73, CollectionEdit.tsx:327)
   * et de Profilum (frontend LinkDetailPage.jsx:146, BioPageEditorPage.jsx:171).
   *
   * `title` ne convient pas : il met le lien DANS le `<h1>`, dont le nom
   * accessible devient « Retour aux fiches Café Arabica » —
   * `getByRole('heading', { name: 'Café Arabica' })` casse
   * (Webum e2e/collections.admin.spec.ts:187).
   *
   * Rendu : `__content > __title-row > [leading, titre]`, sous-titre inchangé
   * en dessous. La rangée n'est émise QUE si `leading` est rendable (même garde
   * que `subtitle` : `leading={cond && <Link/>}` à `false` n'émet rien) ; sans
   * la prop, le balisage est celui d'hier à l'octet près.
   *
   * Disposition : la feuille met la rangée EN LIGNE — lien à GAUCHE du titre,
   * centré (la forme de Webum ; tokens `--umb-page-header-leading-*`). Lien
   * AU-DESSUS du titre (la forme de Profilum) : `unstyledTitleRow`.
   */
  leading?: ReactNode;
  /**
   * N'émet PAS `umb-page-header__title-row` : la feuille ne peut plus mettre la
   * rangée en ligne, elle reste un `<div>` en flux normal — le lien retombe
   * AU-DESSUS du titre et la peau de l'app décide du reste. Même contrat que
   * `unstyledTitle` : le rendu ne dépend plus de la présence de la feuille.
   * Profilum n'importe que `sidebar.css` aujourd'hui ; sans cette prop, importer
   * la feuille complète demain ferait basculer ses liens à gauche du titre.
   * Sans effet sans `leading`.
   */
  unstyledTitleRow?: boolean;
  /** Ajoutée aux classes de la rangée `leading` + titre. Sans effet sans `leading`. */
  titleRowClassName?: string;
  /**
   * Transmis à la rangée (ex. le `gap: 10` de Webum EntryEdit.tsx:104).
   * Sans effet sans `leading`.
   */
  titleRowStyle?: CSSProperties;
}

/** Concaténation « à trous » : au défaut, produit exactement la chaîne d'hier. */
function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * `ReactNode` contient `false`, `true` et `0` — trois valeurs que l'ancien type
 * `string` rendait INATTEIGNABLES. Le `{x && <p/>}` d'hier était donc sûr ; il
 * ne l'est plus une fois le type élargi :
 *
 *   subtitle={items.length}  → `0 && <p>` vaut `0` : React écrit un « 0 » NU,
 *                              hors du `<p>`, enfant direct de `__content`.
 *   period={count}           → idem, « 0 » nu à côté de `__period`.
 *
 * `''` reste traité comme hier (rien n'est rendu), donc la parité avec les
 * appelants `string` existants est intacte : seuls les cas que `string`
 * interdisait changent.
 */
function isRenderable(node: ReactNode): boolean {
  return node !== undefined && node !== null && typeof node !== 'boolean' && node !== '';
}

/**
 * Double classe (`page-header` + `umb-page-header`) : la feuille du paquet ne
 * style que la préfixée, l'historique reste émise pour ne rien changer chez
 * les apps déjà en place. Voir PageHeader.scss.
 */
export function PageHeader({
  title,
  subtitle,
  period,
  actions,
  titleAs = 'h1',
  flatActions = false,
  unstyledTitle = false,
  unstyledSubtitle = false,
  className,
  titleClassName,
  titleStyle,
  subtitleClassName,
  subtitleStyle,
  // À extraire ici, toutes les quatre : oubliée, une prop tomberait dans
  // `rest` et finirait en attribut inconnu sur la racine (`leading="[object
  // Object]"`).
  leading,
  unstyledTitleRow = false,
  titleRowClassName,
  titleRowStyle,
  ...rest
}: PageHeaderProps) {
  const Title = titleAs;

  /*
    `!= null` ne suffisait pas : `false` est un `ReactNode` parfaitement
    valide, et c'est la valeur que produit l'idiome même que l'élargissement
    encourage — `title={canEdit && <span>…</span>}`. Il émettait alors un
    `<h1>` VIDE, précisément ce que la prop dit éviter. `''` garde en revanche
    le comportement d'hier (`<h1>` vide), parce qu'il était atteignable avec
    l'ancien type `string`.
  */
  const titleNode = title !== undefined && title !== null && typeof title !== 'boolean' && (
    <Title
      className={cx(
        'page-header__title',
        !unstyledTitle && 'umb-page-header__title',
        titleClassName,
      )}
      style={titleStyle}
    >
      {title}
    </Title>
  );

  const periodNode = isRenderable(period) && (
    <div className="page-header__period umb-page-header__period">
      <span className="page-header__period-icon umb-page-header__period-icon">📅</span>
      <span className="page-header__period-text umb-page-header__period-text">{period}</span>
    </div>
  );

  const actionsNode = actions && (
    <div className="page-header__actions umb-page-header__actions">{actions}</div>
  );

  return (
    <div
      {...rest}
      className={cx(
        'page-header',
        'umb-page-header',
        flatActions && 'page-header--flat-actions',
        flatActions && 'umb-page-header--flat-actions',
        className,
      )}
    >
      <div className="page-header__content umb-page-header__content">
        {/*
          Sans `leading`, le premier enfant est `titleNode` tel quel : même
          élément, même position qu'hier, donc même balisage et même
          réconciliation. La rangée n'existe que si la fente est remplie.
        */}
        {isRenderable(leading) ? (
          <div
            className={cx(
              'page-header__title-row',
              !unstyledTitleRow && 'umb-page-header__title-row',
              titleRowClassName,
            )}
            style={titleRowStyle}
          >
            {leading}
            {titleNode}
          </div>
        ) : (
          titleNode
        )}
        {isRenderable(subtitle) && (
          <p
            className={cx(
              'page-header__subtitle',
              !unstyledSubtitle && 'umb-page-header__subtitle',
              subtitleClassName,
            )}
            style={subtitleStyle}
          >
            {subtitle}
          </p>
        )}
      </div>

      {flatActions ? (
        <>
          {periodNode}
          {actionsNode}
        </>
      ) : (
        <div className="page-header__meta umb-page-header__meta">
          {periodNode}
          {actionsNode}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
