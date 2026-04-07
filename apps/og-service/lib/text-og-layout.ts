const CONTENT_HEIGHT = 438;
const TWITTER_CONTENT_HEIGHT = 466;
const TITLE_LINE_HEIGHT = 1.05;
const DESCRIPTION_LINE_HEIGHT = 1.6;
const AVERAGE_CHARACTER_WIDTH_RATIO = 0.52;

type TextOgLayoutPreset = {
  maxWidth: number;
  titleFontSize: number;
  descriptionFontSize: number;
  gap: number;
  descriptionLineClamp: number;
};

export type TextOgLayout = TextOgLayoutPreset & {
  renderDescription: boolean;
  titleLineClamp?: number;
};

export type ResolveTextOgLayoutInput = {
  title: string;
  description: string;
  showTwitterFooter: boolean;
  hideDescription: boolean;
};

const TEXT_OG_LAYOUT_PRESETS: TextOgLayoutPreset[] = [
  {
    maxWidth: 760,
    titleFontSize: 80,
    descriptionFontSize: 40,
    gap: 32,
    descriptionLineClamp: 3,
  },
  {
    maxWidth: 840,
    titleFontSize: 72,
    descriptionFontSize: 36,
    gap: 28,
    descriptionLineClamp: 3,
  },
  {
    maxWidth: 900,
    titleFontSize: 64,
    descriptionFontSize: 32,
    gap: 24,
    descriptionLineClamp: 3,
  },
  {
    maxWidth: 940,
    titleFontSize: 56,
    descriptionFontSize: 28,
    gap: 20,
    descriptionLineClamp: 2,
  },
  {
    maxWidth: 960,
    titleFontSize: 50,
    descriptionFontSize: 26,
    gap: 16,
    descriptionLineClamp: 2,
  },
];

export const resolveTextOgLayout = ({
  title,
  description,
  showTwitterFooter,
  hideDescription,
}: ResolveTextOgLayoutInput): TextOgLayout => {
  const renderDescription = !hideDescription && description.trim().length > 0;
  const contentHeight = showTwitterFooter
    ? TWITTER_CONTENT_HEIGHT
    : CONTENT_HEIGHT;

  for (const preset of TEXT_OG_LAYOUT_PRESETS) {
    const height = estimateLayoutHeight({
      preset,
      title,
      description,
      renderDescription,
    });

    if (height <= contentHeight) {
      return {
        ...preset,
        renderDescription,
      };
    }
  }

  const fallback = TEXT_OG_LAYOUT_PRESETS[TEXT_OG_LAYOUT_PRESETS.length - 1];
  const descriptionLineClamp = renderDescription
    ? 1
    : fallback.descriptionLineClamp;
  const descriptionHeight = renderDescription
    ? fallback.descriptionFontSize * DESCRIPTION_LINE_HEIGHT
    : 0;
  const titleHeight =
    contentHeight - (renderDescription ? fallback.gap : 0) - descriptionHeight;
  const titleLineClamp = Math.max(
    1,
    Math.floor(titleHeight / (fallback.titleFontSize * TITLE_LINE_HEIGHT)),
  );

  return {
    ...fallback,
    descriptionLineClamp,
    renderDescription,
    titleLineClamp,
  };
};

const estimateLayoutHeight = ({
  preset,
  title,
  description,
  renderDescription,
}: {
  preset: TextOgLayoutPreset;
  title: string;
  description: string;
  renderDescription: boolean;
}): number => {
  const titleLines = estimateLineCount(
    title,
    preset.maxWidth,
    preset.titleFontSize,
  );
  const titleHeight = titleLines * preset.titleFontSize * TITLE_LINE_HEIGHT;

  if (!renderDescription) {
    return titleHeight;
  }

  const descriptionLines = Math.min(
    estimateLineCount(description, preset.maxWidth, preset.descriptionFontSize),
    preset.descriptionLineClamp,
  );
  const descriptionHeight =
    descriptionLines * preset.descriptionFontSize * DESCRIPTION_LINE_HEIGHT;

  return titleHeight + preset.gap + descriptionHeight;
};

const estimateLineCount = (
  text: string,
  maxWidth: number,
  fontSize: number,
): number => {
  const normalizedText = text.trim().replace(/\s+/g, " ");

  if (normalizedText.length === 0) {
    return 0;
  }

  const lineCapacity = Math.max(
    1,
    Math.floor(maxWidth / (fontSize * AVERAGE_CHARACTER_WIDTH_RATIO)),
  );
  let lineCount = 1;
  let currentLineLength = 0;

  for (const word of normalizedText.split(" ")) {
    const wordLineCount = Math.ceil(word.length / lineCapacity);

    if (wordLineCount > 1) {
      if (currentLineLength > 0) {
        lineCount += 1;
      }
      lineCount += wordLineCount - 1;
      currentLineLength = word.length % lineCapacity;
      continue;
    }

    if (currentLineLength === 0) {
      currentLineLength = word.length;
      continue;
    }

    if (currentLineLength + 1 + word.length <= lineCapacity) {
      currentLineLength += 1 + word.length;
      continue;
    }

    lineCount += 1;
    currentLineLength = word.length;
  }

  return lineCount;
};
