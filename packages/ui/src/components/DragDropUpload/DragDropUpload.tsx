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
 */

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

  const dropZone = (
    <div
      className={`drag-drop-upload ${isDragOver ? 'is-drag-over' : ''} ${isProcessing ? 'is-loading' : ''} ${className}${clickToBrowse ? ' drag-drop-upload--clickable' : ''}`}
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
        {...(ids.input !== undefined ? { 'data-testid': ids.input } : null)}
      />

      <div className="drag-drop-upload__content">
        {isConverting ? (
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
        ) : isLoading ? (
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
        ) : uploadSuccess ? (
          <div className="drag-drop-upload__success">
            <div className="drag-drop-upload__success-icon">✓</div>
            <p className="drag-drop-upload__success-text">{t.success}</p>
          </div>
        ) : (
          <>
            <div className="drag-drop-upload__icon-wrapper">
              {icon ?? <Upload size={48} />}
            </div>

            <div className="drag-drop-upload__text-wrapper">
              <p className="drag-drop-upload__title">
                {multiple ? t.titleMultiple : t.title}
              </p>
              {t.subtitle !== undefined && (
                <p className="drag-drop-upload__subtitle">{t.subtitle}</p>
              )}
              <p className="drag-drop-upload__divider">
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
            </div>

            <div className="drag-drop-upload__meta">
              {t.formats(maxSizeLabel)}
            </div>

            {error && (
              <div
                className="drag-drop-upload__error"
                {...(ids.error !== undefined ? { 'data-testid': ids.error } : null)}
              >
                {error}
              </div>
            )}
          </>
        )}
      </div>
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
    <div className="drag-drop-upload-shell">
      {dropZone}
      <div
        className="drag-drop-upload__queue"
        {...(ids.queue !== undefined ? { 'data-testid': ids.queue } : null)}
      >
        {queue}
      </div>
    </div>
  );
};
