import React from 'react';
import {Alert, Image, StyleSheet, TouchableOpacity, View} from 'react-native';
import type {
  WebViewMessageEvent,
  WebViewNavigation,
} from 'react-native-webview';
import {WebView} from 'react-native-webview';

import {openExternalWebUrl} from '@/shared/lib/device/openExternalWebUrl';
import {normalizeExternalWebUrl} from '@/shared/lib/url/contentLinks';
import type {ContentDetailBodyBlockViewData} from '@/shared/types/contentDetailViewData';

import {COLORS, RADIUS, SPACING} from '../tokens';
import {ImageLightboxModal, type ImageLightboxItem} from './ImageLightboxModal';
import {LinkifiedText} from './LinkifiedText';
import {SkeletonImage} from './SkeletonImage';

interface DetailBodyBlocksProps {
  blocks: ContentDetailBodyBlockViewData[];
}

const IMAGE_ASPECT_RATIO_FALLBACK = 16 / 9;
const imageAspectRatioCache = new Map<string, number>();
const prefetchedImageUrlCache = new Set<string>();

const DETAIL_TABLE_HTML = (tableHtml: string, baseUrl?: string) => `
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <base href="${baseUrl ?? 'https://www.sungkyul.ac.kr/'}" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
      }

      body {
        color: #374151;
        font-size: 12px;
        line-height: 1.4;
        font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
      }

      .table-wrap {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .table-fit-shell {
        display: inline-block;
        vertical-align: top;
      }

      .table-fit-content {
        transform-origin: top left;
      }

      table {
        width: max-content;
        border-collapse: collapse;
        background: #ffffff;
      }

      th, td {
        min-width: 56px;
        padding: 5px 6px;
        border: 1px solid #e5e7eb;
        font-size: 10px;
        line-height: 1.35;
        vertical-align: top;
        text-align: left;
        white-space: normal;
        word-break: break-word;
        overflow-wrap: anywhere;
      }

      th {
        background: #f9fafb;
        font-weight: 700;
        color: #111827;
      }

      td {
        color: #374151;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      p {
        margin: 0;
      }

      a {
        color: #2563eb;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="table-wrap">
      <div class="table-fit-shell">
        <div class="table-fit-content">
          ${tableHtml}
        </div>
      </div>
    </div>
    <script>
      (function () {
        const wrap = document.querySelector('.table-wrap');
        const shell = document.querySelector('.table-fit-shell');
        const content = document.querySelector('.table-fit-content');
        const trailingTextPunctuation = new Set([
          '.', ',', '!', '?', ';', ':', '>', "'", '"', '’', '”',
        ]);
        const trailingDelimiterPairs = [
          { closing: ')', opening: '(' },
          { closing: ']', opening: '[' },
          { closing: '}', opening: '{' },
        ];

        const countCharacter = (value, character) =>
          value.split(character).length - 1;

        const stripTrailingUrlPunctuation = value => {
          const stripTrailingTextPunctuation = candidate => {
            let endIndex = candidate.length;

            while (
              endIndex > 0 &&
              trailingTextPunctuation.has(candidate[endIndex - 1])
            ) {
              endIndex -= 1;
            }

            return candidate.slice(0, endIndex);
          };

          let result = stripTrailingTextPunctuation(value);

          while (result) {
            const trailingPair = trailingDelimiterPairs.find(pair =>
              result.endsWith(pair.closing),
            );

            if (!trailingPair) {
              return result;
            }

            const openingCount = countCharacter(result, trailingPair.opening);
            const closingCount = countCharacter(result, trailingPair.closing);

            if (closingCount <= openingCount) {
              return result;
            }

            result = stripTrailingTextPunctuation(
              result.slice(0, -trailingPair.closing.length),
            );
          }

          return result;
        };

        const linkifyTextNodes = () => {
          if (!content || !document.createTreeWalker) {
            return;
          }

          const walker = document.createTreeWalker(
            content,
            NodeFilter.SHOW_TEXT,
          );
          const textNodes = [];

          while (walker.nextNode()) {
            const textNode = walker.currentNode;
            const parentTag = textNode.parentElement && textNode.parentElement.tagName;

            if (parentTag !== 'A' && parentTag !== 'SCRIPT' && parentTag !== 'STYLE') {
              textNodes.push(textNode);
            }
          }

          textNodes.forEach(textNode => {
            const sourceText = textNode.nodeValue || '';
            const urlPattern = /(?:https?:\\/\\/|www\\.)[a-z0-9.-]+(?::\\d+)?(?:[/?#][^\\s<>"']*)?/gi;
            const fragment = document.createDocumentFragment();
            let cursor = 0;
            let match;

            while ((match = urlPattern.exec(sourceText)) !== null) {
              const matchedText = match[0];
              const linkText = stripTrailingUrlPunctuation(matchedText);

              if (!linkText) {
                continue;
              }

              fragment.appendChild(
                document.createTextNode(sourceText.slice(cursor, match.index)),
              );

              const anchor = document.createElement('a');
              anchor.href = /^www\\./i.test(linkText)
                ? 'https://' + linkText
                : linkText;
              anchor.textContent = linkText;
              fragment.appendChild(anchor);

              const trailingText = matchedText.slice(linkText.length);
              if (trailingText) {
                fragment.appendChild(document.createTextNode(trailingText));
              }

              cursor = match.index + matchedText.length;
            }

            if (cursor === 0) {
              return;
            }

            fragment.appendChild(document.createTextNode(sourceText.slice(cursor)));
            textNode.parentNode && textNode.parentNode.replaceChild(fragment, textNode);
          });
        };

        const applyFit = () => {
          const table = content && content.querySelector('table');

          if (!wrap || !shell || !content || !table) {
            return;
          }

          const availableWidth = wrap.clientWidth || window.innerWidth || 0;
          const naturalWidth = table.scrollWidth || 0;
          const naturalHeight = table.scrollHeight || 0;

          if (!availableWidth || !naturalWidth || !naturalHeight) {
            return;
          }

          const fitScale = availableWidth / naturalWidth;
          const scale =
            fitScale >= 1 ? 1 : fitScale >= 0.78 ? fitScale : 0.88;

          content.style.width = naturalWidth + 'px';
          content.style.height = naturalHeight + 'px';
          content.style.transform = 'scale(' + scale + ')';

          shell.style.width = naturalWidth * scale + 'px';
          shell.style.height = naturalHeight * scale + 'px';
          wrap.style.overflowX =
            naturalWidth * scale > availableWidth + 1 ? 'auto' : 'hidden';
        };

        const postHeight = () => {
          const height = Math.max(
            document.documentElement.scrollHeight || 0,
            document.body.scrollHeight || 0,
          );

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(String(height));
          }
        };

        const refreshLayout = () => {
          applyFit();
          postHeight();
        };

        window.addEventListener('load', function () {
          linkifyTextNodes();
          refreshLayout();
          setTimeout(refreshLayout, 120);
          setTimeout(refreshLayout, 320);
        });

        window.addEventListener('resize', refreshLayout);

        if (window.ResizeObserver) {
          const observer = new ResizeObserver(refreshLayout);
          observer.observe(document.body);
          if (wrap) {
            observer.observe(wrap);
          }
        }
      })();
    </script>
  </body>
</html>
`;

const DetailTableBlock = ({
  baseUrl,
  html,
  onOpenUrl,
}: {
  baseUrl?: string;
  html: string;
  onOpenUrl: (url: string) => void;
}) => {
  const [height, setHeight] = React.useState(0);

  const handleMessage = React.useCallback((event: WebViewMessageEvent) => {
    const nextHeight = Number(event.nativeEvent.data);

    if (Number.isFinite(nextHeight) && nextHeight > 0) {
      setHeight(previousHeight =>
        Math.abs(previousHeight - nextHeight) > 1 ? nextHeight : previousHeight,
      );
    }
  }, []);

  const handleShouldStartLoad = React.useCallback(
    (request: WebViewNavigation) => {
      if (
        request.url === 'about:blank' ||
        request.url.startsWith('data:text/html')
      ) {
        return true;
      }

      const targetUrl = normalizeExternalWebUrl(request.url);

      if (targetUrl) {
        onOpenUrl(targetUrl);
      }

      return false;
    },
    [onOpenUrl],
  );

  return (
    <View style={styles.tableFrame}>
      <WebView
        automaticallyAdjustContentInsets={false}
        originWhitelist={['*']}
        onMessage={handleMessage}
        onOpenWindow={event => {
          const targetUrl = normalizeExternalWebUrl(
            event.nativeEvent.targetUrl,
          );

          if (targetUrl) {
            onOpenUrl(targetUrl);
          }
        }}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        scrollEnabled
        setSupportMultipleWindows={false}
        source={{html: DETAIL_TABLE_HTML(html, baseUrl)}}
        style={[styles.tableWebView, {height}]}
        testID="detail-table-webview"
      />
    </View>
  );
};

export const DetailBodyBlocks = ({blocks}: DetailBodyBlocksProps) => {
  const [viewerIndex, setViewerIndex] = React.useState(0);
  const [viewerVisible, setViewerVisible] = React.useState(false);
  const [resolvedAspectRatios, setResolvedAspectRatios] = React.useState<
    Record<string, number>
  >({});
  const [prefetchedImages, setPrefetchedImages] = React.useState<
    Record<string, boolean>
  >({});

  React.useEffect(() => {
    let isCancelled = false;
    const cachedRatios = blocks.reduce<Record<string, number>>(
      (accumulator, block) => {
        if (block.type !== 'image' || block.aspectRatio) {
          return accumulator;
        }

        const cachedAspectRatio = imageAspectRatioCache.get(block.imageUrl);
        if (cachedAspectRatio) {
          accumulator[block.id] = cachedAspectRatio;
        }

        return accumulator;
      },
      {},
    );

    if (Object.keys(cachedRatios).length > 0) {
      setResolvedAspectRatios(previousRatios => {
        const hasChange = Object.entries(cachedRatios).some(
          ([blockId, aspectRatio]) => previousRatios[blockId] !== aspectRatio,
        );

        if (!hasChange) {
          return previousRatios;
        }

        return {
          ...previousRatios,
          ...cachedRatios,
        };
      });
    }

    blocks.forEach(block => {
      if (block.type !== 'image' || block.aspectRatio) {
        return;
      }

      if (
        resolvedAspectRatios[block.id] ||
        imageAspectRatioCache.has(block.imageUrl)
      ) {
        if (prefetchedImageUrlCache.has(block.imageUrl)) {
          setPrefetchedImages(previousImages => {
            if (previousImages[block.id]) {
              return previousImages;
            }

            return {
              ...previousImages,
              [block.id]: true,
            };
          });
        } else {
          Image.prefetch(block.imageUrl)
            .then(success => {
              if (isCancelled || !success) {
                return;
              }

              prefetchedImageUrlCache.add(block.imageUrl);
              setPrefetchedImages(previousImages => {
                if (previousImages[block.id]) {
                  return previousImages;
                }

                return {
                  ...previousImages,
                  [block.id]: true,
                };
              });
            })
            .catch(() => undefined);
        }

        return;
      }

      Image.getSize(
        block.imageUrl,
        (width, height) => {
          if (isCancelled || !width || !height) {
            return;
          }

          const nextAspectRatio = width / height;
          imageAspectRatioCache.set(block.imageUrl, nextAspectRatio);
          setResolvedAspectRatios(previousRatios => {
            if (previousRatios[block.id] === nextAspectRatio) {
              return previousRatios;
            }

            return {
              ...previousRatios,
              [block.id]: nextAspectRatio,
            };
          });

          Image.prefetch(block.imageUrl)
            .then(success => {
              if (isCancelled || !success) {
                return;
              }

              prefetchedImageUrlCache.add(block.imageUrl);
              setPrefetchedImages(previousImages => {
                if (previousImages[block.id]) {
                  return previousImages;
                }

                return {
                  ...previousImages,
                  [block.id]: true,
                };
              });
            })
            .catch(() => undefined);
        },
        () => undefined,
      );
    });

    return () => {
      isCancelled = true;
    };
  }, [blocks, resolvedAspectRatios]);

  const imageItems = React.useMemo<ImageLightboxItem[]>(
    () =>
      blocks.flatMap(block =>
        block.type === 'image'
          ? [
              {
                alt: block.alt,
                aspectRatio:
                  block.aspectRatio ??
                  resolvedAspectRatios[block.id] ??
                  IMAGE_ASPECT_RATIO_FALLBACK,
                id: block.id,
                source: {uri: block.imageUrl},
              },
            ]
          : [],
      ),
    [blocks, resolvedAspectRatios],
  );

  const imageIndexById = React.useMemo(() => {
    const nextMap = new Map<string, number>();

    imageItems.forEach((image, index) => {
      nextMap.set(image.id, index);
    });

    return nextMap;
  }, [imageItems]);

  const handlePressImage = React.useCallback(
    (blockId: string) => {
      const nextIndex = imageIndexById.get(blockId);

      if (nextIndex === undefined) {
        return;
      }

      setViewerIndex(nextIndex);
      setViewerVisible(true);
    },
    [imageIndexById],
  );

  const handleOpenUrl = React.useCallback((url: string) => {
    openExternalWebUrl(url).catch(() => {
      Alert.alert(
        '링크 열기 오류',
        '외부 브라우저에서 링크를 열지 못했습니다.',
      );
    });
  }, []);

  return (
    <View>
      {blocks.map((block, index) => {
        const isLast = index === blocks.length - 1;

        if (block.type === 'image') {
          const aspectRatio =
            block.aspectRatio ??
            resolvedAspectRatios[block.id] ??
            IMAGE_ASPECT_RATIO_FALLBACK;
          const disableSkeleton =
            prefetchedImages[block.id] ||
            prefetchedImageUrlCache.has(block.imageUrl);

          return (
            <TouchableOpacity
              key={block.id}
              accessibilityHint={
                block.linkUrl
                  ? '탭하면 링크를 열고, 길게 누르면 이미지를 크게 봅니다.'
                  : undefined
              }
              accessibilityLabel={
                block.alt ??
                (block.linkUrl ? '링크가 있는 이미지' : '이미지 크게 보기')
              }
              accessibilityRole="button"
              activeOpacity={0.92}
              delayLongPress={450}
              onLongPress={
                block.linkUrl
                  ? () => {
                      handlePressImage(block.id);
                    }
                  : undefined
              }
              onPress={() => {
                if (block.linkUrl) {
                  handleOpenUrl(block.linkUrl);
                  return;
                }

                handlePressImage(block.id);
              }}
              style={!isLast ? styles.blockSpacing : null}>
              <SkeletonImage
                accessible={false}
                disableSkeleton={disableSkeleton}
                resizeMode="cover"
                source={{uri: block.imageUrl}}
                style={[
                  styles.image,
                  {
                    aspectRatio,
                  },
                ]}
              />
            </TouchableOpacity>
          );
        }

        if (block.type === 'table') {
          return (
            <View key={block.id} style={!isLast ? styles.blockSpacing : null}>
              <DetailTableBlock
                baseUrl={block.baseUrl}
                html={block.html}
                onOpenUrl={handleOpenUrl}
              />
            </View>
          );
        }

        return (
          <LinkifiedText
            key={block.id}
            segments={block.segments}
            selectable
            style={[styles.paragraph, !isLast ? styles.blockSpacing : null]}
            text={block.text}
          />
        );
      })}

      <ImageLightboxModal
        images={imageItems}
        initialIndex={viewerIndex}
        onRequestClose={() => {
          setViewerVisible(false);
        }}
        visible={viewerVisible}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  paragraph: {
    color: COLORS.text.strong,
    fontSize: 14,
    lineHeight: 23,
  },
  image: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.lg,
    width: '100%',
  },
  tableFrame: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.default,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableWebView: {
    backgroundColor: COLORS.background.surface,
    width: '100%',
  },
  blockSpacing: {
    marginBottom: SPACING.lg,
  },
});
