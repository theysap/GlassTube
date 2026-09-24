// Trimmed, synthetic fixtures that mirror the shapes of real YouTube JSON (2025–2026).

export const videoRenderer = {
  videoRenderer: {
    videoId: 'vid00000001',
    title: { runs: [{ text: 'Classic renderer video' }] },
    ownerText: {
      runs: [
        {
          text: 'Channel One',
          navigationEndpoint: {
            browseEndpoint: { browseId: 'UC111', canonicalBaseUrl: '/@channelone' },
          },
        },
      ],
    },
    lengthText: { simpleText: '12:34' },
    shortViewCountText: { simpleText: '1.2M views' },
    publishedTimeText: { simpleText: '3 days ago' },
    thumbnail: {
      thumbnails: [
        { url: 'https://i.ytimg.com/vi/vid00000001/hqdefault.jpg', width: 480 },
        { url: 'https://i.ytimg.com/vi/vid00000001/hq720.jpg', width: 1280 },
      ],
    },
    thumbnailOverlays: [{ thumbnailOverlayResumePlaybackRenderer: { percentDurationWatched: 42 } }],
    navigationEndpoint: {
      commandMetadata: { webCommandMetadata: { url: '/watch?v=vid00000001&pp=abc' } },
    },
  },
};

export const lockup = (id, { live = false, duration = '10:26', progress } = {}) => ({
  lockupViewModel: {
    contentId: id,
    contentType: 'LOCKUP_CONTENT_TYPE_VIDEO',
    contentImage: {
      thumbnailViewModel: {
        image: { sources: [{ url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, width: 336 }] },
        overlays: [
          {
            thumbnailBottomOverlayViewModel: {
              badges: [
                {
                  thumbnailBadgeViewModel: live
                    ? { text: 'LIVE', badgeStyle: 'THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE' }
                    : { text: duration, badgeStyle: 'THUMBNAIL_OVERLAY_BADGE_STYLE_DEFAULT' },
                },
              ],
              ...(progress != null && {
                progressBar: { thumbnailOverlayProgressBarViewModel: { startPercent: progress } },
              }),
            },
          },
        ],
      },
    },
    metadata: {
      lockupMetadataViewModel: {
        title: { content: `Lockup ${id}` },
        image: {
          decoratedAvatarViewModel: {
            avatar: {
              avatarViewModel: {
                image: { sources: [{ url: 'https://yt3.ggpht.com/avatar=s68', width: 68 }] },
              },
            },
            rendererContext: {
              commandContext: {
                onTap: {
                  innertubeCommand: {
                    browseEndpoint: { browseId: 'UC222', canonicalBaseUrl: '/@lockupchannel' },
                  },
                },
              },
            },
          },
        },
        metadata: {
          contentMetadataViewModel: {
            metadataRows: [
              { metadataParts: [{ text: { content: 'Lockup Channel' } }] },
              {
                metadataParts: [
                  { text: { content: live ? '18K watching' : '520 views' } },
                  { text: { content: '2mo ago' } },
                ],
              },
            ],
          },
        },
      },
    },
    rendererContext: {
      commandContext: {
        onTap: {
          innertubeCommand: {
            commandMetadata: { webCommandMetadata: { url: `/watch?v=${id}` } },
          },
        },
      },
    },
  },
});

export const shortsLockup = (id) => ({
  shortsLockupViewModel: {
    entityId: `shorts-shelf-item-${id}`,
    thumbnail: { sources: [{ url: `https://i.ytimg.com/vi/${id}/oar2.jpg`, width: 405 }] },
    onTap: { innertubeCommand: { reelWatchEndpoint: { videoId: id } } },
    overlayMetadata: {
      primaryText: { content: `Short ${id}` },
      secondaryText: { content: '4.4M views' },
    },
  },
});

export const homeData = {
  contents: {
    twoColumnBrowseResultsRenderer: {
      tabs: [
        {
          tabRenderer: {
            content: {
              richGridRenderer: {
                contents: [
                  { richItemRenderer: { content: lockup('home0000001') } },
                  {
                    richItemRenderer: {
                      content: { adSlotRenderer: { ad: lockup('ad000000001') } },
                    },
                  },
                  {
                    richSectionRenderer: {
                      content: {
                        richShelfRenderer: {
                          title: { runs: [{ text: 'Shorts' }] },
                          contents: [
                            { richItemRenderer: { content: shortsLockup('short000001') } },
                            { richItemRenderer: { content: shortsLockup('short000002') } },
                          ],
                        },
                      },
                    },
                  },
                  { richItemRenderer: { content: lockup('home0000002', { live: true }) } },
                  { richItemRenderer: { content: videoRenderer } },
                  { richItemRenderer: { content: lockup('home0000001') } },
                ],
              },
            },
          },
        },
      ],
    },
  },
};

export const watchData = {
  currentVideoEndpoint: { watchEndpoint: { videoId: 'current0001' } },
  contents: {
    twoColumnWatchNextResults: {
      results: { results: { contents: [] } },
      secondaryResults: {
        secondaryResults: { results: [lockup('related0001'), lockup('related0002')] },
      },
      playlist: {
        playlist: {
          title: 'My Mix',
          playlistId: 'PL123',
          contents: [
            {
              playlistPanelVideoRenderer: {
                videoId: 'plist000001',
                title: { simpleText: 'Playlist entry' },
                shortBylineText: { runs: [{ text: 'Someone' }] },
                lengthText: { simpleText: '3:21' },
                selected: true,
                navigationEndpoint: {
                  commandMetadata: {
                    webCommandMetadata: { url: '/watch?v=plist000001&list=PL123&index=1' },
                  },
                },
              },
            },
          ],
        },
      },
    },
  },
};
