import React, { useState, useRef, DragEvent, ChangeEvent, ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../Button';
// Styles are imported separately via @umbeli-com/ui/styles

/**
 * Zone de dépôt de fichiers.
 *
 * Deux régimes :
 *
 * - UN fichier (historique) : `onFileSelect` reçoit le fichier retenu.
 * - UN LOT (`multiple`) : `onFilesSelect` reçoit la sélection entière, en une
 *   fois. C'est ce qui manquait à Anonymum (`DocumentsPanel`, jusqu'à
 *   `MAX_BATCH = 50` documents) : avec un rappel mono-fichier, une file
 *   d'attente ne peut pas se constituer — l'app rappelait le composant N fois
 *   et perdait la notion de lot.
 *
 * Le composant reste la CIBLE de dépôt, pas la file : la liste des fichiers
 * (statut par ligne, progression, retrait) est rendue par l'app via le slot
 * `queue`, parce que sa forme est propre à chaque produit.
 *
 * La validation intégrée (extensions média + taille) reste le défaut ; elle
 * s'élargit par `allowedExtensions` ou se remplace intégralement par
 * `validate` — une app qui accepte des PDF/DOCX, ou qui veut voir les
 * fichiers refusés pour les afficher en erreur dans SA file, n'a plus à
 * contourner le composant.
 *
 * Reste l'APPARENCE. Le duo « ou » + « Parcourir les fichiers » était rendu
 * d'office : une zone dont TOUTE la surface est cliquable (`clickToBrowse`)
 * affiche alors un bouton qui refait ce que fait déjà le moindre clic, et
 * c'est ce bouton en trop qui a fait refuser le composant. `showBrowseButton`
 * l'enlève — le duo entier, car un « ou » qui n'introduit plus rien ne veut
 * plus rien dire.
 *
 * Et la peau se rend à l'app : `classNames` nomme chaque partie, `unstyled`
 * retire les classes du paquet. Sans quoi une règle du paquet peut battre
 * celle de l'app à la spécificité — `.drag-drop-upload:hover:not(.is-loading)
 * :not(.is-drag-over)` pèse (0,3,0) contre (0,2,0) pour un `.ma-zone:hover` :
 * l'app posait sa classe et gardait quand même le survol du paquet.
 */

/**
 * Disposition de la zone au repos.
 *
 * - `default` (historique) : `[input, __content > [__icon-wrapper > icône,
 *   __text-wrapper > [titre, sous-titre, « ou », bouton], __meta, erreur]]`.
 * - `flat` : À PLAT — icône, titre, sous-titre, « ou » + bouton, formats et
 *   erreur sont des enfants DIRECTS de la zone : ni `__content`, ni
 *   `__text-wrapper`, ni enveloppe d'icône. L'équivalent de `flatActions` de
 *   PageHeader. Les zones écrites à la main posent leurs parties en items flex
 *   directs, espacés par le `gap` de la zone : Profilum `.dropzone`
 *   (Wizard.jsx:271 — icône / `<strong>` / `.hint`, `gap: 12px`) et Webum
 *   `.media-dropzone` (Media.tsx:98 — icône / `<span>`). Enveloppées, trois
 *   parties n'en faisaient plus qu'une et le rythme vertical s'effondrait.
 *   En `flat`, `classNames.icon` est sans objet : l'icône est posée telle
 *   quelle, l'app habille l'élément qu'elle passe en `icon`. Les états
 *   envoi/conversion/succès gardent leur propre sous-arbre, posé lui aussi
 *   directement dans la zone.
 */
export type DragDropUploadLayout = 'default' | 'flat';

/** Balise du titre / du sous-titre. */
export type DragDropUploadTextTag = 'p' | 'span' | 'strong' | 'div';

/** Chaînes affichées, surchargeables. Français par défaut. */
export interface DragDropUploadLabels {
  /** Défaut : « Glissez votre fichier ici ». */
  title?: string;
  /** Titre en mode `multiple`. Défaut : « Glissez vos fichiers ici ». */
  titleMultiple?: string;
  /** Ligne d'explication sous le titre. Rien par défaut. */
  subtitle?: ReactNode;
  /** Défaut : « ou ». */
  or?: string;
  /** Défaut : « Parcourir les fichiers ». */
  browse?: string;
  /** Ligne des formats acceptés. Reçoit la taille max déjà mise en forme. */
  formats?: (maxSize: string) => ReactNode;
  /** Défaut : « Téléchargement en cours... ». */
  uploading?: string;
  /** Défaut : « Conversion en cours... » (si `conversionMessage` est vide). */
  converting?: string;
  /** Défaut : « Fichier téléchargé avec succès ! ». */
  success?: string;
  /** Extension refusée. */
  errorType?: string;
  /** Taille dépassée. Reçoit la taille max déjà mise en forme. */
  errorSize?: (maxSize: string) => string;
  /** Lot tronqué par `maxFiles`. */
  errorTooMany?: (maxFiles: number) => string;
}

/**
 * Classes posées sur chaque partie, en plus (ou à la place, avec `unstyled`)
 * de celles du paquet. Même forme que `testIds` : les apps nomment leurs
 * parties comme elles veulent (`f2docs-drop__title`…), ces noms ne se
 * dérivent pas les uns des autres.
 */
export interface DragDropUploadClassNames {
  /** Le conteneur `drag-drop-upload-shell` (n'existe qu'avec le slot `queue`). */
  shell?: string;
  /** Le bloc centré dans la zone (`drag-drop-upload__content`). */
  content?: string;
  /** L'enveloppe de l'icône. */
  icon?: string;
  /** Le bloc titre + sous-titre + bouton. */
  text?: string;
  /** Le titre (« Glissez vos fichiers ici »). */
  title?: string;
  /** La ligne d'explication (`labels.subtitle`). */
  subtitle?: string;
  /** Le « ou » entre le titre et le bouton. */
  divider?: string;
  /** La ligne des formats acceptés. */
  meta?: string;
  /** Le message d'erreur de validation. */
  error?: string;
  /** Le conteneur du slot `queue`. */
  queue?: string;
  /**
   * Classe de l'état « on survole avec un fichier ». S'AJOUTE à `is-drag-over`
   * tant que la peau du paquet est posée ; la REMPLACE en `unstyled`. Sans
   * elle, c'est `is-drag-over` seule, comme avant.
   */
  dragOver?: string;
  /**
   * Classe de l'état « envoi/conversion en cours ». Même règle que `dragOver` :
   * en plus de `is-loading` avec la peau du paquet, à sa place en `unstyled`.
   * Sans quoi `.drag-drop-upload.is-loading` ne s'appliquerait plus et la zone
   * resterait cliquable et survolable pendant l'envoi.
   */
  loading?: string;
}

/** `data-testid` posés sur les points d'ancrage. Les apps ont des noms non
 *  dérivables les uns des autres (`f2docs-drop` / `f2docs-input`), d'où
 *  l'objet plutôt qu'un préfixe unique. */
export interface DragDropUploadTestIds {
  /** La zone de dépôt elle-même. */
  root?: string;
  /** L'`<input type="file">` caché — celui que `setInputFiles` vise. */
  input?: string;
  /** Le bouton « Parcourir les fichiers ». */
  browse?: string;
  /** Le conteneur du slot `queue`. */
  queue?: string;
  /** Le message d'erreur de validation. */
  error?: string;
}

export interface DragDropUploadProps {
  /**
   * Fichier retenu, régime mono-fichier. Optionnel depuis `multiple` : en mode
   * lot c'est `onFilesSelect` qui porte la sélection. Tous les appels
   * existants restent valides — la prop n'a changé ni de nom, ni de forme.
   */
  onFileSelect?: (file: File) => void;
  /** Accepter plusieurs fichiers d'un coup (dépôt ET sélecteur). */
  multiple?: boolean;
  /** Lot retenu, en une fois. Utilisé dès que `multiple`. */
  onFilesSelect?: (files: File[]) => void;
  /** Plafond du lot. Au-delà, les premiers `maxFiles` passent et l'utilisateur
   *  est averti (`labels.errorTooMany`) — rien n'est perdu en silence. */
  maxFiles?: number;
  /** File d'attente rendue par l'app, SOUS la zone de dépôt. Tant qu'il est
   *  absent, le composant rend exactement ce qu'il rendait avant. */
  queue?: ReactNode;
  /** Cliquer (ou Entrée/Espace) n'importe où dans la zone ouvre le sélecteur,
   *  pas seulement le bouton. Défaut `false` : le comportement historique. */
  clickToBrowse?: boolean;
  /**
   * Afficher le « ou » et le bouton « Parcourir les fichiers ». Défaut :
   * `true` (historique). `false` ⇒ ni l'un ni l'autre — la zone n'a plus
   * qu'un titre, et c'est elle qu'on clique (`clickToBrowse`).
   */
  showBrowseButton?: boolean;
  /**
   * NU : le composant ne pose plus SES classes de peau (`drag-drop-upload`,
   * `…__content`, `…__icon-wrapper`, `…__title`, `…__subtitle`,
   * `…__divider`, `…__meta`, `…__error`, `…__text-wrapper`, la coquille et la
   * file). Il ne reste que `className` / `classNames` et les classes d'état.
   * Deux exceptions VOLONTAIRES : l'`<input>` garde `…__input` (c'est lui qui
   * le cache, pas une peau), et les sous-arbres de progression/succès gardent
   * les leurs — sans équivalent côté app, ils disparaîtraient à l'écran.
   */
  unstyled?: boolean;
  /** Disposition au repos (défaut `default`). Voir `DragDropUploadLayout`. */
  layout?: DragDropUploadLayout;
  /** Balise du titre (défaut `p`). Profilum cible `.dropzone strong`, Webum
   *  rend un `<span>`. */
  titleAs?: DragDropUploadTextTag;
  /** Balise du sous-titre `labels.subtitle` (défaut `p`). */
  subtitleAs?: DragDropUploadTextTag;
  /**
   * Rendre la ligne des formats acceptés (`labels.formats`). Défaut `true`
   * (historique). `false` : la ligne n'existe plus du tout — y compris quand
   * `labels.formats` renvoie `null`, où elle restait un item flex VIDE, qui
   * ajoutait un `gap` de plus sous le titre.
   */
  showMeta?: boolean;
  /**
   * Cacher l'`<input type="file">` par l'attribut `hidden`, sans dépendre de
   * la feuille du paquet. Par défaut il n'est caché QUE par
   * `.drag-drop-upload__input` : une app qui n'importe pas la feuille
   * (Profilum) le verrait apparaître. `input.click()` et `setInputFiles` de
   * Playwright fonctionnent sur un input `hidden`.
   * Défaut : `true` en `layout="flat"`, `false` sinon (rendu historique).
   */
  hideInput?: boolean;
  /** Classes de l'app, partie par partie. */
  classNames?: DragDropUploadClassNames;
  /** Extensions acceptées (« .pdf », « .docx »…). Remplace la liste média par
   *  défaut. `[]` = aucun filtrage par extension. */
  allowedExtensions?: string[];
  /** Validation complète, à la place de celle du composant (extensions +
   *  taille). Renvoie le message d'erreur, ou `null` pour accepter. */
  validate?: (file: File) => string | null | undefined;
  /** Icône de la zone au repos. Défaut : `<Upload size={48} />`. */
  icon?: ReactNode;
  labels?: DragDropUploadLabels;
  /** Posé en `data-testid` sur la zone de dépôt. Raccourci de `testIds.root`. */
  testId?: string;
  testIds?: DragDropUploadTestIds;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  isLoading?: boolean;
  uploadSuccess?: boolean;
  uploadProgress?: number; // 0-100
  uploadedBytes?: number;
  totalBytes?: number;
  isConverting?: boolean;
  conversionProgress?: number; // 0-100
  conversionMessage?: string;
}

// Helper to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/** Liste historique — média uniquement. Reste le défaut. */
const DEFAULT_EXTENSIONS = [
  '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.mpeg', '.mpg', '.mts', '.ts', '.ogv',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.svg'
];

// `subtitle` à part : `Required<>` lui retirerait le `undefined`, or son défaut
// EST « rien » — c'est ce qui garde la zone identique à ce qu'elle rendait.
const defaultLabels: Required<Omit<DragDropUploadLabels, 'subtitle'>> & { subtitle?: ReactNode } = {
  title: 'Glissez votre fichier ici',
  titleMultiple: 'Glissez vos fichiers ici',
  // Ligne muette par défaut : la zone rend exactement ce qu'elle rendait.
  subtitle: undefined,
  or: 'ou',
  browse: 'Parcourir les fichiers',
  formats: (maxSize: string) =>
    `Formats supportés: MP4, MOV, AVI, MKV, WMV, FLV, WebM, HEIC, HEIF, JPG, PNG, GIF, WebP (Max ${maxSize})`,
  uploading: 'Téléchargement en cours...',
  converting: 'Conversion en cours...',
  success: 'Fichier téléchargé avec succès !',
  errorType: 'Type de fichier non supporté. Formats acceptés: MP4, MOV, AVI, MKV, WMV, FLV, WebM, HEIC, HEIF, JPG, PNG, GIF, WebP',
  errorSize: (maxSize: string) => `Le fichier dépasse la taille maximale de ${maxSize}`,
  errorTooMany: (maxFiles: number) => `${maxFiles} fichiers au maximum : les suivants ont été ignorés.`,
};

export const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onFileSelect,
  multiple = false,
  onFilesSelect,
  maxFiles,
  queue,
  clickToBrowse = false,
  showBrowseButton = true,
  unstyled = false,
  layout = 'default',
  titleAs = 'p',
  subtitleAs = 'p',
  showMeta = true,
  hideInput,
  classNames,
  allowedExtensions,
  validate,
  icon,
  labels,
  testId,
  testIds,
  accept = 'video/*,image/*',
  maxSizeMB = 2048, // 2GB default
  className = '',
  isLoading = false,
  uploadSuccess = false,
  uploadProgress = 0,
  uploadedBytes = 0,
  totalBytes = 0,
  isConverting = false,
  conversionProgress = 0,
  conversionMessage = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = { ...defaultLabels, ...labels };
  // `root` se résout, il ne s'écrase pas : un objet partiel
  // (`testIds={{ input: 'x' }}`, ou une clé posée à `undefined` par un helper)
  // ne doit pas effacer le raccourci `testId`.
  const ids: DragDropUploadTestIds = { ...testIds, root: testIds?.root ?? testId };
  const maxSizeLabel = maxSizeMB >= 1024 ? `${(maxSizeMB / 1024).toFixed(0)}GB` : `${maxSizeMB}MB`;

  // Classe d'une partie : celle du paquet (sauf en `unstyled`), puis celle de
  // l'app. Vide ⇒ l'attribut `class` n'est pas écrit du tout, plutôt qu'un
  // `class=""` qui salirait le DOM.
  const cn = classNames ?? {};
  const skin = (own: string, app?: string): string => {
    const base = unstyled ? '' : own;
    if (!app) return base;
    return base ? `${base} ${app}` : app;
  };
  // Classe d'ÉTAT : même règle que les autres parties. Tant que la peau du
  // paquet est posée, la classe de l'app s'AJOUTE à celle du paquet — elle ne
  // la remplace pas. La remplacer décrocherait les règles d'état du paquet de
  // la peau qu'on a justement gardée : `.drag-drop-upload.is-loading` porte
  // `pointer-events: none` / `cursor: not-allowed` / l'opacité, et
  // `:hover:not(.is-loading):not(.is-drag-over)` continuerait d'éclairer la
  // zone PENDANT l'envoi. C'est en `unstyled` — là où plus aucune règle du
  // paquet ne s'applique — que la classe de l'app prend toute la place.
  const stateClass = (own: string, app?: string): string => {
    if (!app) return own;
    return unstyled ? app : `${own} ${app}`;
  };
  const dragOverClass = stateClass('is-drag-over', cn.dragOver);
  const loadingClass = stateClass('is-loading', cn.loading);
  const skinAttr = (value: string) => (value ? { className: value } : null);

  // Message d'extension refusée. Sans `allowedExtensions` NI `labels.errorType`,
  // c'est le littéral historique, au caractère près. Dès que l'app fournit sa
  // propre liste, le défaut cite SA liste : sinon un dépôt de PDF s'entend
  // répondre « Formats acceptés: MP4, MOV, AVI… », qui ne décrit rien de ce
  // qu'accepte l'app et fait passer le refus pour un bug du composant.
  const errorTypeLabel =
    labels?.errorType ??
    (allowedExtensions && allowedExtensions.length > 0
      ? `Type de fichier non supporté. Formats acceptés: ${allowedExtensions
          .map(ext => ext.replace(/^\./, '').toUpperCase())
          .join(', ')}`
      : defaultLabels.errorType);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  /** Renvoie le message d'erreur, ou `null` si le fichier passe. */
  const checkFile = (file: File): string | null => {
    if (validate) return validate(file) ?? null;

    // Check file type - be very permissive for supported extensions
    const fileName = file.name.toLowerCase();
    const supportedExtensions = allowedExtensions ?? DEFAULT_EXTENSIONS;

    const hasSupportedExtension =
      supportedExtensions.length === 0 || supportedExtensions.some(ext => fileName.endsWith(ext.toLowerCase()));

    if (!hasSupportedExtension) return errorTypeLabel;

    // Check size
    if (file.size > maxSizeMB * 1024 * 1024) return t.errorSize(maxSizeLabel);

    return null;
  };

  const validateFile = (file: File): boolean => {
    setError(null);
    const message = checkFile(file);
    if (message) {
      setError(message);
      return false;
    }
    return true;
  };

  /** Point d'entrée unique du dépôt et du sélecteur. */
  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;

    if (!multiple) {
      const file = list[0];
      if (!validateFile(file)) return;
      if (onFileSelect) onFileSelect(file);
      else onFilesSelect?.([file]);
      return;
    }

    setError(null);
    const picked = Array.from(list);
    const capped = maxFiles !== undefined ? picked.slice(0, Math.max(0, maxFiles)) : picked;

    const accepted: File[] = [];
    let firstError: string | null = null;
    for (const file of capped) {
      const message = checkFile(file);
      if (message) {
        if (!firstError) firstError = message;
        continue;
      }
      accepted.push(file);
    }

    // Le plafond prime sur une erreur de fichier : c'est celui qui explique
    // pourquoi une partie du lot a disparu de l'écran.
    if (capped.length < picked.length && maxFiles !== undefined) firstError = t.errorTooMany(maxFiles);
    if (firstError) setError(firstError);
    if (accepted.length === 0) return;

    if (onFilesSelect) onFilesSelect(accepted);
    else accepted.forEach(file => onFileSelect?.(file));
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isLoading || isConverting) return;

    handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isLoading || isConverting) return;

    handleFiles(e.target.files);
    // Remettre l'input à zéro pour que redéposer LE MÊME fichier redéclenche
    // l'événement. Réservé au mode lot : en mono-fichier, le comportement
    // historique est conservé tel quel.
    if (multiple) e.target.value = '';
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const isProcessing = isLoading || isConverting;
  const flat = layout === 'flat';
  const inputHidden = hideInput ?? flat;
  const Title = titleAs;
  const Subtitle = subtitleAs;

  // `unstyled` : plus de classe du paquet sur la racine — donc plus non plus
  // de `drag-drop-upload--clickable`, qui ne portait que le liseré de focus du
  // paquet. C'est l'app qui montre le focus, comme elle montre tout le reste.
  const rootClass = unstyled
    ? [isDragOver ? dragOverClass : '', isProcessing ? loadingClass : '', className]
        .filter(Boolean)
        .join(' ')
    : `drag-drop-upload ${isDragOver ? dragOverClass : ''} ${isProcessing ? loadingClass : ''} ${className}${clickToBrowse ? ' drag-drop-upload--clickable' : ''}${flat ? ' drag-drop-upload--flat' : ''}`;

  // ── Parties au repos, partagées par les deux dispositions ────────────────
  // En `default`, elles sont posées exactement où elles l'étaient ; en `flat`,
  // les mêmes éléments remontent en enfants directs de la zone.
  const iconElement = icon ?? <Upload size={48} />;

  const textNodes = (
    <>
      <Title {...skinAttr(skin('drag-drop-upload__title', cn.title))}>
        {multiple ? t.titleMultiple : t.title}
      </Title>
      {t.subtitle !== undefined && (
        <Subtitle {...skinAttr(skin('drag-drop-upload__subtitle', cn.subtitle))}>{t.subtitle}</Subtitle>
      )}
      {/* Le « ou » et le bouton forment un tout : ils partent ensemble. */}
      {showBrowseButton && (
        <>
          <p {...skinAttr(skin('drag-drop-upload__divider', cn.divider))}>
            {t.or}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleButtonClick}
            type="button"
            testId={ids.browse}
          >
            {t.browse}
          </Button>
        </>
      )}
    </>
  );

  const metaNode = showMeta && (
    <div {...skinAttr(skin('drag-drop-upload__meta', cn.meta))}>
      {t.formats(maxSizeLabel)}
    </div>
  );

  const errorNode = error && (
    <div
      {...skinAttr(skin('drag-drop-upload__error', cn.error))}
      {...(ids.error !== undefined ? { 'data-testid': ids.error } : null)}
    >
      {error}
    </div>
  );

  // Disposition À PLAT : les mêmes parties, sans `__content` ni enveloppes.
  const restingNodes = (
    <>
      {iconElement}
      {textNodes}
      {metaNode}
      {errorNode}
    </>
  );

  // États envoi / conversion / succès : un seul sous-arbre, prioritaire dans
  // cet ordre, identique dans les deux dispositions.
  const busyOrDone = isConverting || isLoading || uploadSuccess;
  function renderState() {
    if (isConverting) {
      return (
        <div className="drag-drop-upload__loader drag-drop-upload__converting">
          <div className="drag-drop-upload__progress-container">
            <div className="drag-drop-upload__progress-bar drag-drop-upload__progress-bar--conversion">
              <div
                className="drag-drop-upload__progress-fill drag-drop-upload__progress-fill--conversion"
                style={{ width: `${conversionProgress}%` }}
              />
            </div>
            <p className="drag-drop-upload__progress-percentage">{conversionProgress}%</p>
          </div>
          <p className="drag-drop-upload__progress-text">{conversionMessage || t.converting}</p>
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="drag-drop-upload__loader">
          <div className="drag-drop-upload__progress-container">
            <div className="drag-drop-upload__progress-bar">
              <div
                className="drag-drop-upload__progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="drag-drop-upload__progress-percentage">{uploadProgress}%</p>
            {totalBytes > 0 && (
              <p className="drag-drop-upload__progress-bytes">
                {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
              </p>
            )}
          </div>
          <p className="drag-drop-upload__progress-text">{t.uploading}</p>
        </div>
      );
    }
    return (
      <div className="drag-drop-upload__success">
        <div className="drag-drop-upload__success-icon">✓</div>
        <p className="drag-drop-upload__success-text">{t.success}</p>
      </div>
    );
  }

  const dropZone = (
    <div
      {...(rootClass ? { className: rootClass } : null)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      // Étalés seulement quand ils ont une valeur : à leur défaut, l'élément
      // rendu est exactement celui d'avant (mêmes attributs, même ordre).
      {...(clickToBrowse
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: (e: React.MouseEvent<HTMLDivElement>) => {
              // Le bouton « Parcourir » et l'input caché ouvrent DÉJÀ le
              // sélecteur ; sans ce garde, leur clic remonterait jusqu'ici et
              // le rouvrirait dans la foulée.
              const target = e.target as HTMLElement | null;
              if (target?.closest?.('input, button')) return;
              if (!isProcessing) handleButtonClick();
            },
            onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
              // Idem au clavier : Entrée/Espace sur le bouton intérieur ne doit
              // pas être traité une seconde fois par la zone.
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!isProcessing) handleButtonClick();
              }
            },
          }
        : null)}
      {...(ids.root !== undefined ? { 'data-testid': ids.root } : null)}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept={accept}
        className="drag-drop-upload__input"
        disabled={isProcessing}
        multiple={multiple}
        {...(inputHidden ? { hidden: true } : null)}
        {...(ids.input !== undefined ? { 'data-testid': ids.input } : null)}
      />

      {flat ? (
        busyOrDone ? renderState() : restingNodes
      ) : (
        <div {...skinAttr(skin('drag-drop-upload__content', cn.content))}>
          {busyOrDone ? (
            renderState()
          ) : (
            <>
              <div {...skinAttr(skin('drag-drop-upload__icon-wrapper', cn.icon))}>
                {iconElement}
              </div>

              <div {...skinAttr(skin('drag-drop-upload__text-wrapper', cn.text))}>
                {textNodes}
              </div>

              {metaNode}

              {errorNode}
            </>
          )}
        </div>
      )}
    </div>
  );

  // Sans slot `queue`, la zone de dépôt est rendue seule — exactement l'arbre
  // d'avant, sans conteneur supplémentaire qui décalerait les styles des apps.
  // `undefined`, mais aussi `null` / `false` : un slot conditionnel côté app
  // (`queue={items.length > 0 && <Liste />}`) vaut `false` tant que la file est
  // vide, et ouvrir le conteneur pour rien laisserait un `gap` de 1rem de vide
  // sous la zone de dépôt.
  if (queue === undefined || queue === null || queue === false) return dropZone;

  return (
    <div {...skinAttr(skin('drag-drop-upload-shell', cn.shell))}>
      {dropZone}
      <div
        {...skinAttr(skin('drag-drop-upload__queue', cn.queue))}
        {...(ids.queue !== undefined ? { 'data-testid': ids.queue } : null)}
      >
        {queue}
      </div>
    </div>
  );
};
