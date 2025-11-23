import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Stack,
  Paper,
  useTheme,
  alpha,
  Grid,
  Chip,
  Card,
  CardContent,
  Avatar,
  Badge,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
  Slide,
  Fade,
  Zoom,
  Backdrop,
  Dialog,
  DialogContent,
  useMediaQuery,
  Skeleton,
} from '@mui/material';
import {
  ArrowRight,
  Sparkles,
  Play,
  Shield,
  Users,
  Rocket,
  UserPlus,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Crown,
  Zap,
  Globe,
  Star,
  Award,
  Activity,
  Radio,
  Gift,
  Coffee,
  Headphones,
  Camera,
  Mic,
  Video,
  ShoppingBag,
  Coins,
  Diamond,
  Flame,
  Target,
  Layers,
  Compass,
  MousePointer,
  ChevronRight,
  ExternalLink,
  Download,
  Smartphone,
  Monitor,
  Tablet,
  BookOpen,
  Code,
  Paintbrush,
  Music,
  GamepadIcon,
  Briefcase,
  GraduationCap,
  MapPin,
  Calendar,
  Clock,
  Wifi,
  Bluetooth,
  Battery,
  Signal,
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomTheme } from '@/contexts/ThemeContext';
import { HomePageGuard } from '@/components/auth/HomePageGuard';
import { createStreamingStyles, streamingAnimations } from '@/components/streaming';
import { EnhancedStreamCard } from '@/components/streaming';

// ============================================================================
// MODERN INNOVATIVE HOME PAGE
// ============================================================================

// Motion components
const MotionBox = motion(Box);
const MotionCard = motion(Card);
const MotionPaper = motion(Paper);
const MotionChip = motion(Chip);
const MotionButton = motion(Button);
const MotionTypography = motion(Typography);

// Particle system component
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

const ParticleSystem = ({ count = 50 }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  
  useEffect(() => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      speed: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
    }));
    setParticles(newParticles);
  }, [count]);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          animate={{
            y: [0, -100, 0],
            opacity: [particle.opacity, particle.opacity * 0.3, particle.opacity],
          }}
          transition={{
            duration: particle.speed * 10,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #4fc3f7, #29b6f6)',
            boxShadow: '0 0 6px #4fc3f7',
          }}
        />
      ))}
    </Box>
  );
};

// Floating stats component
const FloatingStats = () => {
  const [stats, setStats] = useState({
    users: 247891,
    streams: 1247,
    messages: 89234,
    nfts: 12847,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        users: prev.users + Math.floor(Math.random() * 3),
        streams: prev.streams + (Math.random() > 0.7 ? 1 : 0),
        messages: prev.messages + Math.floor(Math.random() * 10),
        nfts: prev.nfts + (Math.random() > 0.8 ? 1 : 0),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const statItems = [
    { label: 'Active Users', value: stats.users.toLocaleString(), icon: Users, color: '#4fc3f7' },
    { label: 'Live Streams', value: stats.streams.toLocaleString(), icon: Radio, color: '#ff4d6d' },
    { label: 'Messages/Day', value: stats.messages.toLocaleString(), icon: MessageCircle, color: '#66bb6a' },
    { label: 'NFTs Traded', value: stats.nfts.toLocaleString(), icon: Diamond, color: '#ffa726' },
  ];

  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5 }}
      sx={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 1000,
        display: { xs: 'none', md: 'block' },
      }}
    >
      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          minWidth: 200,
        }}
      >
        <Stack spacing={1.5}>
          {statItems.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.7 + index * 0.1 }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    p: 0.5,
                    borderRadius: 1,
                    bgcolor: alpha(stat.color, 0.2),
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <stat.icon size={14} color={stat.color} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="text.primary">
                    {stat.value}
                  </Typography>
                </Box>
              </Stack>
            </motion.div>
          ))}
        </Stack>
      </Paper>
    </MotionBox>
  );
};

// Define types for the feature object
interface Feature {
  id?: string;
  title: string;
  description: string;
  icon: React.ElementType; // Use ElementType which is more generic
  color: string;
  tags: string[];
  demo: string;
}

// Interactive feature card
const FeatureCard = ({ feature, index, onDemo }: { feature: Feature; index: number; onDemo: (feature: Feature) => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: '-100px' });

  return (
    <MotionCard
      ref={cardRef}
      initial={{ opacity: 0, y: 60, rotateX: -15 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.6, ease: 'easeOut' }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(feature.color, 0.05)}, ${alpha(feature.color, 0.02)})`,
        border: `1px solid ${alpha(feature.color, 0.1)}`,
        borderRadius: 4,
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-8px) scale(1.02)',
          boxShadow: `0 20px 40px ${alpha(feature.color, 0.2)}`,
        },
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onClick={() => onDemo(feature)}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 100,
          height: 100,
          background: `radial-gradient(circle, ${alpha(feature.color, 0.1)}, transparent)`,
          borderRadius: '0 0 0 100%',
        }}
      />
      
      <CardContent sx={{ p: 3, position: 'relative', zIndex: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(feature.color, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${alpha(feature.color, 0.2)}`,
              }}
            >
              <feature.icon size={28} color={feature.color} />
            </Box>
            <Badge
              badgeContent="NEW"
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  height: 16,
                  minWidth: 16,
                },
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                {feature.title}
              </Typography>
            </Badge>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {feature.description}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {feature.tags.map((tag: string) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{
                  bgcolor: alpha(feature.color, 0.1),
                  color: feature.color,
                  border: `1px solid ${alpha(feature.color, 0.2)}`,
                  fontSize: '0.7rem',
                }}
              />
            ))}
          </Stack>

          <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-end', pt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              endIcon={<ExternalLink size={14} />}
              sx={{
                borderColor: feature.color,
                color: feature.color,
                '&:hover': {
                  borderColor: feature.color,
                  bgcolor: alpha(feature.color, 0.1),
                },
              }}
            >
              Try Demo
            </Button>
          </Box>
        </Stack>
      </CardContent>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 3,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: feature.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Play size={18} />
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionCard>
  );
};

// Live streams carousel
const LiveStreamsCarousel = () => {
  const [currentStream, setCurrentStream] = useState(0);
  
  const mockStreams = [
    {
      id: 1,
      title: 'Web3 Development Tutorial',
      streamer: { name: 'Alex Chen', avatar: '/avatars/alex.jpg', verified: true },
      viewers: 1247,
      category: 'Education',
      thumbnail: '/thumbnails/stream1.jpg',
    },
    {
      id: 2,
      title: 'NFT Art Creation Live',
      streamer: { name: 'Sarah Kim', avatar: '/avatars/sarah.jpg', verified: true },
      viewers: 892,
      category: 'Art',
      thumbnail: '/thumbnails/stream2.jpg',
    },
    {
      id: 3,
      title: 'DeFi Trading Strategies',
      streamer: { name: 'Mike Rodriguez', avatar: '/avatars/mike.jpg', verified: false },
      viewers: 2156,
      category: 'Finance',
      thumbnail: '/thumbnails/stream3.jpg',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStream((prev) => (prev + 1) % mockStreams.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [mockStreams.length]);

  return (
    <Box sx={{ position: 'relative', height: 300, borderRadius: 3, overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {mockStreams.map((stream, index) => (
          index === currentStream && (
            <motion.div
              key={stream.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                  },
                }}
              >
                <Stack alignItems="center" spacing={2} sx={{ position: 'relative', zIndex: 2 }}>
                  <Play size={48} color="white" />
                  <Typography variant="h6" color="white" textAlign="center">
                    {stream.title}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar src={stream.streamer.avatar} sx={{ width: 24, height: 24 }} />
                    <Typography variant="body2" color="white">
                      {stream.streamer.name}
                    </Typography>
                    <Chip 
                      label={`${stream.viewers} viewers`} 
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                  </Stack>
                </Stack>
              </Box>
            </motion.div>
          )
        ))}
      </AnimatePresence>

      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 1,
          zIndex: 3,
        }}
      >
        {mockStreams.map((_, index) => (
          <Box
            key={index}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: index === currentStream ? 'white' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onClick={() => setCurrentStream(index)}
          />
        ))}
      </Box>
    </Box>
  );
};

export default function ModernHomePage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated, isLoading, user } = useAuth();
  const { reducedMotion } = useCustomTheme();
  const streamingStyles = createStreamingStyles(theme);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, 100]);

  const [mounted, setMounted] = useState(false);
  const [activeDemo, setActiveDemo] = useState<Feature | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const heroInView = useInView(heroRef);
  const featuresInView = useInView(featuresRef, { margin: '-200px' });
  const statsInView = useInView(statsRef, { margin: '-100px' });

  useEffect(() => {
    setMounted(true);
  }, []);

  const features = [
    {
      id: 'social',
      title: 'Social Hub',
      description: 'Connect with creators, share moments, and build meaningful relationships in the Web3 space.',
      icon: Users,
      color: '#4fc3f7',
      tags: ['Posts', 'Stories', 'Communities'],
      demo: 'social',
    },
    {
      id: 'streaming',
      title: 'Live Streaming',
      description: 'Go live with HD quality, real-time chat, and monetization tools built for creators.',
      icon: Radio,
      color: '#ff4d6d',
      tags: ['HD Streaming', 'Chat', 'Donations'],
      demo: 'streaming',
    },
    {
      id: 'nft',
      title: 'NFT Marketplace',
      description: 'Discover, create, and trade unique digital assets with zero gas fees on layer 2.',
      icon: Diamond,
      color: '#ab47bc',
      tags: ['Trading', 'Minting', 'Collections'],
      demo: 'nft',
    },
    {
      id: 'dao',
      title: 'DAO Governance',
      description: 'Participate in decentralized decision-making with transparent voting and proposals.',
      icon: Shield,
      color: '#66bb6a',
      tags: ['Voting', 'Proposals', 'Treasury'],
      demo: 'dao',
    },
    {
      id: 'defi',
      title: 'DeFi Integration',
      description: 'Yield farming, staking, and trading directly integrated into your social experience.',
      icon: TrendingUp,
      color: '#ffa726',
      tags: ['Staking', 'Yield', 'Trading'],
      demo: 'defi',
    },
    {
      id: 'creator',
      title: 'Creator Economy',
      description: 'Monetize your content with subscriptions, tips, and exclusive creator tools.',
      icon: Crown,
      color: '#ef5350',
      tags: ['Subscriptions', 'Tips', 'Analytics'],
      demo: 'creator',
    },
  ];

  const handleDemo = (feature: Feature) => {
    setActiveDemo(feature);
  };

  const handleCloseDemo = () => {
    setActiveDemo(null);
  };

  if (!mounted) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 60,
              height: 60,
              border: '3px solid rgba(79, 195, 247, 0.3)',
              borderTop: '3px solid #4fc3f7',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <Typography variant="h6" color="text.secondary">
            Loading the future...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <HomePageGuard>
      <Head>
        <title>TalkCart — The Future of Web3 Social</title>
        <meta name="description" content="Experience the most advanced Web3 platform combining social networking, live streaming, NFT marketplace, DAO governance, and DeFi - all in one revolutionary app." />
        <meta name="keywords" content="Web3, social network, NFT, DeFi, DAO, live streaming, blockchain, crypto, digital assets" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Box sx={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
        {/* Floating real-time stats */}
        <FloatingStats />

        {/* Revolutionary Hero Section */}
        <Box
          ref={heroRef}
          sx={{
            position: 'relative',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            background: `
              radial-gradient(ellipse at 20% 0%, ${alpha('#4fc3f7', 0.15)} 0%, transparent 50%),
              radial-gradient(ellipse at 80% 100%, ${alpha('#ab47bc', 0.15)} 0%, transparent 50%),
              radial-gradient(ellipse at 60% 40%, ${alpha('#66bb6a', 0.1)} 0%, transparent 50%)
            `,
            overflow: 'hidden',
          }}
        >
          <ParticleSystem />
          
          <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 10 }}>
            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} lg={6}>
                <Stack spacing={4}>
                  {/* Revolutionary badge */}
                  <MotionBox
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={heroInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <Chip
                      icon={<Sparkles size={18} />}
                      label="🚀 Revolutionary Web3 Platform - Now Live!"
                      sx={{
                        alignSelf: 'flex-start',
                        px: 3,
                        py: 1,
                        height: 'auto',
                        background: `linear-gradient(135deg, ${alpha('#4fc3f7', 0.1)}, ${alpha('#ab47bc', 0.1)})`,
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha('#4fc3f7', 0.3)}`,
                        color: '#4fc3f7',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          boxShadow: `0 8px 25px ${alpha('#4fc3f7', 0.3)}`,
                        },
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </MotionBox>

                  {/* Hero headline */}
                  <MotionBox
                    initial={{ opacity: 0, y: 40 }}
                    animate={heroInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    <Typography
                      variant="h1"
                      sx={{
                        fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem', lg: '5.5rem' },
                        fontWeight: 900,
                        lineHeight: 0.9,
                        letterSpacing: '-0.025em',
                        background: `linear-gradient(135deg, #4fc3f7 0%, #ab47bc 50%, #66bb6a 100%)`,
                        backgroundSize: '200% 200%',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 2,
                        position: 'relative',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          bottom: -8,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: `linear-gradient(90deg, #4fc3f7, #ab47bc, #66bb6a)`,
                          borderRadius: 2,
                          transform: 'scaleX(0)',
                          transformOrigin: 'left',
                          animation: 'expandLine 2s ease-out 1s forwards',
                        },
                        '@keyframes expandLine': {
                          to: { transform: 'scaleX(1)' },
                        },
                      }}
                    >
                      The Future
                      <br />
                      is Here
                    </Typography>
                    <Typography
                      variant="h2"
                      sx={{
                        fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.8rem', lg: '2.2rem' },
                        fontWeight: 400,
                        color: 'text.secondary',
                        lineHeight: 1.4,
                      }}
                    >
                      Experience Web3 like never before
                    </Typography>
                  </MotionBox>

                  {/* Subtitle */}
                  <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={heroInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.8 }}
                  >
                    <Typography
                      variant="h5"
                      sx={{
                        fontSize: { xs: '1rem', sm: '1.2rem', md: '1.4rem' },
                        fontWeight: 400,
                        lineHeight: 1.6,
                        color: 'text.secondary',
                        maxWidth: '90%',
                      }}
                    >
                      Join millions in the most advanced Web3 ecosystem. 
                      <Box component="span" sx={{ color: '#4fc3f7', fontWeight: 600 }}>
                        {' '}Social networking, live streaming, NFT trading, DAO governance, and DeFi{' '}
                      </Box>
                      seamlessly unified in one revolutionary platform.
                    </Typography>
                  </MotionBox>

                  {/* CTA Buttons */}
                  <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={heroInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 1 }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                      <MotionButton
                        variant="contained"
                        size="large"
                        onClick={() => router.push('/auth/register')}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        sx={{
                          px: { xs: 4, sm: 6 },
                          py: { xs: 2, sm: 2.5 },
                          fontSize: { xs: '1.1rem', sm: '1.3rem' },
                          fontWeight: 700,
                          borderRadius: 4,
                          background: 'linear-gradient(135deg, #4fc3f7 0%, #ab47bc 100%)',
                          boxShadow: '0 12px 40px rgba(79, 195, 247, 0.4)',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                            transition: 'left 0.6s',
                          },
                          '&:hover::before': {
                            left: '100%',
                          },
                        }}
                        endIcon={<Rocket size={24} />}
                      >
                        Launch Your Journey
                      </MotionButton>

                      <MotionButton
                        variant="outlined"
                        size="large"
                        onClick={() => router.push('/explore')}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        sx={{
                          px: { xs: 4, sm: 6 },
                          py: { xs: 2, sm: 2.5 },
                          fontSize: { xs: '1.1rem', sm: '1.3rem' },
                          fontWeight: 600,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: '#4fc3f7',
                          color: '#4fc3f7',
                          background: 'rgba(79, 195, 247, 0.05)',
                          backdropFilter: 'blur(20px)',
                          '&:hover': {
                            borderWidth: 2,
                            borderColor: '#4fc3f7',
                            background: 'rgba(79, 195, 247, 0.1)',
                            boxShadow: '0 12px 40px rgba(79, 195, 247, 0.2)',
                          },
                        }}
                        startIcon={<Play size={24} />}
                      >
                        Explore Live Now
                      </MotionButton>
                    </Stack>
                  </MotionBox>

                  {/* Trust indicators */}
                  <MotionBox
                    initial={{ opacity: 0 }}
                    animate={heroInView ? { opacity: 1 } : {}}
                    transition={{ delay: 1.2, duration: 0.6 }}
                  >
                    <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
                      {[
                        { icon: Shield, label: 'Bank-Grade Security', color: '#66bb6a' },
                        { icon: Zap, label: 'Lightning Fast', color: '#ffa726' },
                        { icon: Globe, label: 'Global Community', color: '#4fc3f7' },
                      ].map((item, index) => (
                        <Stack key={index} direction="row" alignItems="center" spacing={1}>
                          <item.icon size={20} color={item.color} />
                          <Typography variant="body2" fontWeight={600} color={item.color}>
                            {item.label}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </MotionBox>
                </Stack>
              </Grid>

              <Grid item xs={12} lg={6}>
                <MotionBox
                  style={{ y }}
                  initial={{ opacity: 0, scale: 0.8, rotateY: 15 }}
                  animate={heroInView ? { opacity: 1, scale: 1, rotateY: 0 } : {}}
                  transition={{ duration: 1, delay: 0.6 }}
                >
                  {/* 3D Interactive Demo */}
                  <Box
                    sx={{
                      position: 'relative',
                      height: { xs: 400, md: 500, lg: 600 },
                      perspective: '1000px',
                    }}
                  >
                    {/* Central platform hub */}
                    <MotionBox
                      animate={{
                        rotateY: [0, 360],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        rotateY: { duration: 20, repeat: Infinity, ease: 'linear' },
                        scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
                      }}
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: { xs: 200, md: 250 },
                        height: { xs: 200, md: 250 },
                      }}
                    >
                      <Paper
                        elevation={20}
                        sx={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 6,
                          background: `
                            linear-gradient(135deg, 
                              ${alpha('#4fc3f7', 0.1)} 0%, 
                              ${alpha('#ab47bc', 0.1)} 50%,
                              ${alpha('#66bb6a', 0.1)} 100%
                            )
                          `,
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 6,
                            padding: 2,
                            background: 'linear-gradient(135deg, #4fc3f7, #ab47bc, #66bb6a)',
                            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                            maskComposite: 'xor',
                            WebkitMaskComposite: 'xor',
                            animation: 'borderGlow 3s linear infinite',
                          },
                          '@keyframes borderGlow': {
                            '0%': { opacity: 0.5 },
                            '50%': { opacity: 1 },
                            '100%': { opacity: 0.5 },
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: '3rem', md: '4rem' },
                            background: 'linear-gradient(135deg, #4fc3f7, #ab47bc, #66bb6a)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
                          }}
                        >
                          🚀
                        </Typography>
                      </Paper>
                    </MotionBox>

                    {/* Orbiting feature icons */}
                    {[
                      { icon: '💎', color: '#ab47bc', radius: 180, speed: 15 },
                      { icon: '🌊', color: '#4fc3f7', radius: 220, speed: 18 },
                      { icon: '⚡', color: '#ffa726', radius: 200, speed: 12 },
                      { icon: '🎯', color: '#66bb6a', radius: 240, speed: 20 },
                      { icon: '👥', color: '#ef5350', radius: 160, speed: 10 },
                      { icon: '📡', color: '#26a69a', radius: 260, speed: 22 },
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: item.speed,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transformOrigin: `${item.radius}px 0px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <MotionBox
                          whileHover={{ scale: 1.2, y: -10 }}
                          animate={{
                            y: [0, -10, 0],
                            rotate: [0, 5, -5, 0],
                          }}
                          transition={{
                            y: { duration: 3, repeat: Infinity, delay: index * 0.5 },
                            rotate: { duration: 4, repeat: Infinity, delay: index * 0.3 },
                          }}
                        >
                          <Paper
                            elevation={10}
                            sx={{
                              width: { xs: 60, md: 80 },
                              height: { xs: 60, md: 80 },
                              borderRadius: '50%',
                              background: alpha(item.color, 0.1),
                              backdropFilter: 'blur(10px)',
                              border: `2px solid ${alpha(item.color, 0.3)}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: { xs: '1.5rem', md: '2rem' },
                              '&:hover': {
                                boxShadow: `0 10px 30px ${alpha(item.color, 0.3)}`,
                              },
                              transition: 'all 0.3s ease',
                            }}
                          >
                            {item.icon}
                          </Paper>
                        </MotionBox>
                      </motion.div>
                    ))}
                  </Box>
                </MotionBox>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Live Streams Section */}
        <Box
          ref={statsRef}
          sx={{
            py: { xs: 8, md: 12 },
            background: `linear-gradient(180deg, 
              ${alpha(theme.palette.background.default, 0.8)} 0%, 
              ${alpha('#4fc3f7', 0.05)} 50%, 
              ${alpha(theme.palette.background.default, 0.8)} 100%
            )`,
            backdropFilter: 'blur(10px)',
          }}
        >
          <Container maxWidth="xl">
            <MotionBox
              initial={{ opacity: 0, y: 40 }}
              animate={statsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
              sx={{ textAlign: 'center', mb: 8 }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontWeight: 800,
                  mb: 2,
                  background: 'linear-gradient(135deg, #4fc3f7, #ab47bc)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Live Right Now
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                Join thousands of creators streaming live across gaming, education, art, and more
              </Typography>
            </MotionBox>

            <Grid container spacing={4}>
              <Grid item xs={12} md={8}>
                <LiveStreamsCarousel />
              </Grid>
              <Grid item xs={12} md={4}>
                <Stack spacing={3}>
                  <MotionPaper
                    initial={{ opacity: 0, x: 20 }}
                    animate={statsInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.2 }}
                    sx={{
                      p: 3,
                      background: alpha('#ff4d6d', 0.05),
                      border: `1px solid ${alpha('#ff4d6d', 0.1)}`,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Radio size={24} color="#ff4d6d" />
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          1,247
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Live Streams
                        </Typography>
                      </Box>
                    </Stack>
                  </MotionPaper>

                  <MotionPaper
                    initial={{ opacity: 0, x: 20 }}
                    animate={statsInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.4 }}
                    sx={{
                      p: 3,
                      background: alpha('#4fc3f7', 0.05),
                      border: `1px solid ${alpha('#4fc3f7', 0.1)}`,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Users size={24} color="#4fc3f7" />
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          89.2K
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active Viewers
                        </Typography>
                      </Box>
                    </Stack>
                  </MotionPaper>

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={() => router.push('/streams/enhanced')}
                    sx={{
                      mt: 2,
                      py: 2,
                      background: 'linear-gradient(135deg, #ff4d6d, #ff6b6b)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #ee5a24, #ff4d6d)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                    endIcon={<ArrowRight size={20} />}
                  >
                    Explore All Streams
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Revolutionary Features Section */}
        <Box
          ref={featuresRef}
          sx={{
            py: { xs: 8, md: 12 },
            position: 'relative',
          }}
        >
          <Container maxWidth="xl">
            <MotionBox
              initial={{ opacity: 0, y: 40 }}
              animate={featuresInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
              sx={{ textAlign: 'center', mb: 8 }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontWeight: 800,
                  mb: 2,
                  background: 'linear-gradient(135deg, #66bb6a, #4fc3f7, #ab47bc)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Revolutionary Features
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto' }}>
                Experience the next generation of Web3 with our integrated ecosystem of social, financial, and creative tools
              </Typography>
            </MotionBox>

            <Grid container spacing={4}>
              {features.map((feature, index) => (
                <Grid item xs={12} sm={6} lg={4} key={index}>
                  <FeatureCard
                    feature={feature}
                    index={index}
                    onDemo={handleDemo}
                  />
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Call to Action Section */}
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            background: `linear-gradient(135deg, 
              ${alpha('#4fc3f7', 0.1)} 0%, 
              ${alpha('#ab47bc', 0.1)} 50%, 
              ${alpha('#66bb6a', 0.1)} 100%
            )`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Container maxWidth="lg">
            <MotionBox
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              sx={{ textAlign: 'center' }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  fontWeight: 900,
                  mb: 3,
                  background: 'linear-gradient(135deg, #4fc3f7, #ab47bc, #66bb6a)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Ready to Shape
                <br />
                the Future?
              </Typography>
              
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{ mb: 6, maxWidth: 600, mx: 'auto', lineHeight: 1.5 }}
              >
                Join the Web3 revolution today and be part of the most innovative digital ecosystem ever created.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
                <MotionButton
                  variant="contained"
                  size="large"
                  onClick={() => router.push('/auth/register')}
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  sx={{
                    px: 6,
                    py: 3,
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, #4fc3f7 0%, #ab47bc 100%)',
                    boxShadow: '0 15px 45px rgba(79, 195, 247, 0.4)',
                    '&:hover': {
                      boxShadow: '0 20px 60px rgba(79, 195, 247, 0.5)',
                    },
                  }}
                  endIcon={<Rocket size={28} />}
                >
                  Start Your Journey
                </MotionButton>

                <MotionButton
                  variant="outlined"
                  size="large"
                  onClick={() => router.push('/streams/enhanced')}
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  sx={{
                    px: 6,
                    py: 3,
                    fontSize: '1.3rem',
                    fontWeight: 600,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: '#66bb6a',
                    color: '#66bb6a',
                    '&:hover': {
                      borderWidth: 2,
                      borderColor: '#66bb6a',
                      background: alpha('#66bb6a', 0.1),
                      boxShadow: '0 12px 40px rgba(102, 187, 106, 0.2)',
                    },
                  }}
                  startIcon={<Eye size={28} />}
                >
                  Explore Platform
                </MotionButton>
              </Stack>
            </MotionBox>
          </Container>
        </Box>

        {/* Demo Dialog */}
        <Dialog
          open={Boolean(activeDemo)}
          onClose={handleCloseDemo}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              background: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(20px)',
            },
          }}
        >
          <DialogContent sx={{ p: 4 }}>
            {activeDemo && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  {activeDemo.title} Demo
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Interactive demo coming soon! This feature is in development.
                </Typography>
                <Box
                  sx={{
                    height: 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${alpha(activeDemo.color, 0.1)}, transparent)`,
                    borderRadius: 3,
                    border: `1px solid ${alpha(activeDemo.color, 0.2)}`,
                  }}
                >
                  <activeDemo.icon size={80} color={activeDemo.color} />
                </Box>
                <Button
                  variant="contained"
                  onClick={handleCloseDemo}
                  sx={{ mt: 3 }}
                >
                  Close Preview
                </Button>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </HomePageGuard>
  );
}

