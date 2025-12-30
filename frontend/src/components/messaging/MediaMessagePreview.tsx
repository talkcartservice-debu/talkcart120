import React from "react";
import {
  Box,
  Paper,
  Typography,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import {
  Image as ImageIcon,
  Video,
  Mic,
  File,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { MessageMedia } from "@/types/message";
import UnifiedImageMedia from "../media/UnifiedImageMedia";
import UnifiedVideoMedia from "../media/UnifiedVideoMedia";
import { isKnownMissingFile } from "@/utils/mediaUtils";

interface MediaMessagePreviewProps {
  media: MessageMedia;
  onClick?: () => void;
  onDownload?: (mediaUrl: string, filename: string) => void;
  showInfo?: boolean;
  size?: "small" | "medium" | "large";
  style?: React.CSSProperties;
}

const MediaMessagePreview: React.FC<MediaMessagePreviewProps> = ({
  media,
  onClick,
  onDownload,
  showInfo = true,
  size = "medium",
  style,
}) => {
  const theme = useTheme();

  const isMissingFile = media.url && isKnownMissingFile(media.url);

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return { width: 80, height: 60, fontSize: "0.7rem" };
      case "large":
        return { width: 200, height: 150, fontSize: "0.9rem" };
      case "medium":
      default:
        return { width: 120, height: 90, fontSize: "0.8rem" };
    }
  };

  const sizeStyles = getSizeStyles();

  const renderMediaContent = () => {
    if (isMissingFile) {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: { xs: sizeStyles.width * 0.8, sm: sizeStyles.width },
            height: { xs: sizeStyles.height * 0.8, sm: sizeStyles.height },
            bgcolor: alpha(theme.palette.error.main, 0.1),
            border: `1px dashed ${alpha(theme.palette.error.main, 0.3)}`,
            borderRadius: 2,
            p: 1,
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <File size={Math.round(sizeStyles.width / 3)} />
            <Typography
              variant="caption"
              sx={{ fontSize: sizeStyles.fontSize }}
            >
              Missing
            </Typography>
          </Box>
        </Box>
      );
    }

    switch (media.type) {
      case "image":
        return (
          <Box sx={{ width: { xs: sizeStyles.width * 0.8, sm: sizeStyles.width }, height: { xs: sizeStyles.height * 0.8, sm: sizeStyles.height } }}>
            <UnifiedImageMedia
              src={media.url}
              alt={media.filename || "Image"}
              maxHeight="100%"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '8px',
                objectFit: 'cover',
                cursor: onClick ? "pointer" : "default"
              }}
            />
          </Box>
        );

      case "video":
        return (
          <Box sx={{ width: { xs: sizeStyles.width * 0.8, sm: sizeStyles.width }, height: { xs: sizeStyles.height * 0.8, sm: sizeStyles.height } }}>
            <UnifiedVideoMedia
              src={media.url}
              alt={media.filename || "Video"}
              maxHeight="100%"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '8px',
                objectFit: 'cover',
                cursor: onClick ? "pointer" : "default"
              }}
            />
          </Box>
        );

      case "audio":
        return (
          <Paper
            elevation={0}
            onClick={onClick}
            sx={{
              width: { xs: sizeStyles.width * 0.8, sm: sizeStyles.width },
              height: { xs: sizeStyles.height * 0.8, sm: sizeStyles.height },
              p: 1,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              cursor: onClick ? "pointer" : "default",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              <Mic
                size={Math.round(sizeStyles.width / 3 * 0.8)}
                color={theme.palette.primary.main}
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: sizeStyles.fontSize,
                  fontWeight: 500,
                  mt: 0.5,
                  display: "block",
                }}
              >
                Voice
              </Typography>
            </Box>
          </Paper>
        );

      default:
        return (
          <Paper
            elevation={0}
            onClick={onClick}
            sx={{
              width: { xs: sizeStyles.width * 0.8, sm: sizeStyles.width },
              height: { xs: sizeStyles.height * 0.8, sm: sizeStyles.height },
              p: 1,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              border: `1px solid ${theme.palette.divider}`,
              cursor: onClick ? "pointer" : "default",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              <File size={Math.round(sizeStyles.width / 3 * 0.8)} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: sizeStyles.fontSize,
                  fontWeight: 500,
                  mt: 0.5,
                  display: "block",
                }}
              >
                File
              </Typography>
            </Box>
          </Paper>
        );
    }
  };

  return (
    <Box sx={{ position: "relative", ...style }}>
      {renderMediaContent()}

      {showInfo && (
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: alpha(theme.palette.common.black, 0.7),
            p: 0.5,
            borderRadius: "0 0 8px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.common.white,
              fontSize: sizeStyles.fontSize,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {media.filename || "File"}
          </Typography>
          {onDownload && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(media.url, media.filename || "media");
              }}
              sx={{ color: theme.palette.common.white, ml: 0.5 }}
            >
              <Download size={12} />
            </IconButton>
          )}
        </Box>
      )}
    </Box>
  );
};

export default MediaMessagePreview;
