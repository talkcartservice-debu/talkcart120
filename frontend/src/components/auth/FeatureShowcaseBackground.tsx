import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Fade,
  Slide,
  useTheme,
  alpha,
  Stack,
  Chip,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  MessageCircle,
  ShoppingCart,
  Video,
  Users,
  Coins,
  TrendingUp,
  Globe,
  Zap,
  Shield,
  Smartphone,
  Wallet,
  Heart,
  Star,
  Play,
  Send,
  Gift,
  Crown,
  Gamepad2,
  Music,
  Camera,
  Mic,
  Share2,
  ThumbsUp,
  Eye,
  Clock,
  Award,
  Target,
  Rocket,
  Sparkles,
} from 'lucide-react';

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  stats?: string;
  category: 'social' | 'marketplace' | 'streaming' | 'defi' | 'gaming';
}

const features: FeatureCard[] = [
  // Social Features
  {
    id: 'social-chat',
    title: 'Real-time Messaging',
    description: 'Connect with friends through instant messaging, voice, and video calls',
    icon: <span style={{ display: 'inline-flex', alignItems: 'center' }}><MessageCircle size={24} /></span>,
    color: '#4F46E5',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    stats: '10M+ messages daily',
    category: 'social',
  },
  {
    id: 'social-community',
    title: 'Community Spaces',
    description: 'Join communities, create groups, and engage with like-minded people',
    icon: <span style={{ display: 'inline-flex', alignItems: 'center' }}><Users size={24} /></span>,
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
    stats: '50K+ communities',
    category: 'social',
  },
  {
    id: 'social-content',
    title: 'Content Sharing',
    description: 'Share photos, videos, stories, and moments with your network',
    icon: <span style={{ display: 'inline-flex', alignItems: 'center' }}><Camera size={24} /></span>,
    color: '#DC2626',
    gradient: 'linear-gradient(135deg, #DC2626 0%, #EA580C 100%)',
    stats: '1M+ posts shared',
    category: 'social',
  },
  
  // Marketplace Features
  {
    id: 'marketplace-shop',
    title: 'Digital Marketplace',
    description: 'Buy and sell digital goods, NFTs, and services with crypto payments',
    icon: <span style={{ display: 'inline-flex', alignItems: 'center' }}><ShoppingCart size={24} /></span>,
    color: '#7C2D12',
    gradient: 'linear-gradient(135deg, #7C2D12 0%, #A16207 100%)',
    stats: '$2M+ in transactions',
    category: 'marketplace',
  },
  {
    id: 'marketplace-nft',
    title: 'NFT Trading',
    description: 'Discover, collect, and trade unique digital assets and NFTs',
    icon: <span style={{ display: 'inline-flex', alignItems: 'center' }}><Sparkles size={24} /></span>,
    color: '#BE185D',
    gradient: 'linear-gradient(135deg, #BE185D 0%, #C2410C 100%)',
    stats: '100K+ NFTs traded',
    category: 'marketplace',
  },
  {
    id: 'marketplace-services',
    title: 'Service Exchange',
    description: 'Offer your skills or hire talent for digital services and gigs',
    icon: <span style={{ display: 'inline-flex', alignItems: 'center' }}><Target size={24} /></span>,
    color: '#1E40AF',
    gradient: 'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)',
    stats: '25K+ services listed',
    category: 'marketplace',
  },

  // Streaming Features
  {
    id: 'streaming-live',
    title: 'Live Streaming',
    description: 'Stream live content, gaming, music, and interact with your audience',
    icon: <span style={{ display: 'inline-flex', alignItems: 'center' }}><Video size={24} /></span>,
    color: '#B91C1C',
    gradient: 'linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)',
    stats: '500K+ hours streamed',
    category: 'streaming',
  },
  {
    id: 'streaming-music',
    title: 'Music & Audio',
    description: 'Share music, podcasts, and audio content with built-in player',
    icon: <span style={{ display: 'inline-flex', alignItems: 'center' }}><Music size={24} /></span>,
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
    stats: '1M+ tracks played',
    category: 'streaming',
  },
  {
    id: 'streaming-gaming',
    title: 'Gaming Hub',
    description: 'Stream gameplay, join tournaments, and connect with gamers',
    icon: <span style={{ display: 'inline-flex', alignItems: 'center' }}><Gamepad2 size={24} /></span>,
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    stats: '200K+ gamers',
    category: 'streaming',
  },

  // DeFi Features
  {
    id: 'defi-wallet',
    title: 'Crypto Wallet',
    description: 'Secure multi-chain wallet with DeFi integration and staking',
    icon: <span style={{ display: 'inline-flex', alignItems: 'center' }}><Wallet size={24} /></span>,
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    stats: '$50M+ secured',
    category: 'defi',
  },
  {
    id: 'defi-trading',
    title: 'DeFi Trading',
    description: 'Trade cryptocurrencies, provide liquidity, and earn rewards',
    icon: <span style={{ display: 'inline-flex', alignItems: 'center' }}><TrendingUp size={24} /></span>,
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    stats: '$10M+ trading volume',
    category: 'defi',
  },
  {
    id: 'defi-rewards',
    title: 'Yield Farming',
    description: 'Stake tokens, earn rewards, and participate in liquidity mining',
    icon: <span style={{ display: 'inline-flex', alignItems: 'center' }}><Coins size={24} /></span>,
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    stats: '15% average APY',
    category: 'defi',
  },
];

const categoryColors = {
  social: '#4F46E5',
  marketplace: '#7C2D12',
  streaming: '#B91C1C',
  defi: '#F59E0B',
  gaming: '#059669',
};

const categoryLabels = {
  social: 'Social',
  marketplace: 'Marketplace',
  streaming: 'Streaming',
  defi: 'DeFi',
  gaming: 'Gaming',
};

export default function FeatureShowcaseBackground() {
  const theme = useTheme();
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [visibleFeatures, setVisibleFeatures] = useState<FeatureCard[]>([]);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    // Rotate through features every 4 seconds
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prev) => (prev + 1) % features.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Show 3 features at a time, rotating the selection
    const startIndex = currentFeatureIndex;
    const selectedFeatures = [
      features[startIndex],
      features[(startIndex + 1) % features.length],
      features[(startIndex + 2) % features.length],
    ].filter(feature => feature !== undefined) as FeatureCard[];
    setVisibleFeatures(selectedFeatures);
  }, [currentFeatureIndex]);

  useEffect(() => {
    // Animation phases for dynamic effects
    const phaseInterval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 4);
    }, 2000);

    return () => clearInterval(phaseInterval);
  }, []);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        background: `
          radial-gradient(circle at 20% 20%, ${alpha('#4F46E5', 0.1)} 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, ${alpha('#7C3AED', 0.1)} 0%, transparent 50%),
          radial-gradient(circle at 40% 60%, ${alpha('#059669', 0.08)} 0%, transparent 50%),
          linear-gradient(135deg, 
            ${theme.palette.mode === 'dark' ? '#0F172A' : '#F8FAFC'} 0%, 
            ${theme.palette.mode === 'dark' ? '#1E293B' : '#E2E8F0'} 100%
          )
        `,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 100px,
              ${alpha(theme.palette.primary.main, 0.02)} 100px,
              ${alpha(theme.palette.primary.main, 0.02)} 101px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 100px,
              ${alpha(theme.palette.primary.main, 0.02)} 100px,
              ${alpha(theme.palette.primary.main, 0.02)} 101px
            )
          `,
        },
      }}
    >
      {/* Floating Feature Cards */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          right: '5%',
          bottom: '10%',
          pointerEvents: 'none',
          display: { xs: 'none', md: 'block' }, // Hide on mobile for better performance
        }}
      >
        {visibleFeatures.map((feature, index) => (
          <Fade
            key={`${feature.id}-${currentFeatureIndex}`}
            in={true}
            timeout={1000}
            style={{ transitionDelay: `${index * 200}ms` }}
          >
            <Card
              sx={{
                position: 'absolute',
                width: { xs: 280, sm: 320, md: 360 },
                top: `${20 + index * 25}%`,
                left: index % 2 === 0 ? '5%' : 'auto',
                right: index % 2 === 1 ? '5%' : 'auto',
                background: `linear-gradient(135deg, 
                  ${alpha(feature.color, 0.1)} 0%, 
                  ${alpha(feature.color, 0.05)} 100%
                )`,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(feature.color, 0.2)}`,
                borderRadius: 3,
                transform: `
                  translateY(${Math.sin((animationPhase + index) * 0.5) * 10}px)
                  rotate(${index % 2 === 0 ? -2 : 2}deg)
                `,
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: `
                    translateY(${Math.sin((animationPhase + index) * 0.5) * 10 - 5}px)
                    rotate(0deg)
                    scale(1.02)
                  `,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start" mb={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: feature.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: theme.palette.text.primary,
                          fontSize: '1.1rem',
                        }}
                      >
                        {feature.title}
                      </Typography>
                      <Chip
                        label={categoryLabels[feature.category]}
                        size="small"
                        sx={{
                          backgroundColor: alpha(feature.color, 0.1),
                          color: feature.color,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.secondary,
                        lineHeight: 1.4,
                        mb: 1,
                      }}
                    >
                      {feature.description}
                    </Typography>
                    {feature.stats && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: feature.color,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <Box component="span"><TrendingUp size={12} /></Box>
                        {feature.stats}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Fade>
        ))}
      </Box>

      {/* Animated Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
        }}
      >
        {/* Floating Icons */}
        {[
          { icon: <Box component="span"><Globe size={20} /></Box>, top: '15%', left: '15%', delay: 0 },
          { icon: <Box component="span"><Zap size={16} /></Box>, top: '25%', right: '20%', delay: 1 },
          { icon: <Box component="span"><Shield size={18} /></Box>, bottom: '30%', left: '10%', delay: 2 },
          { icon: <Box component="span"><Rocket size={22} /></Box>, bottom: '20%', right: '15%', delay: 3 },
          { icon: <Box component="span"><Star size={14} /></Box>, top: '40%', left: '8%', delay: 4 },
          { icon: <Box component="span"><Heart size={16} /></Box>, top: '60%', right: '12%', delay: 5 },
        ].map((item, index) => (
          <Box
            key={index}
            sx={{
              position: 'absolute',
              ...item,
              color: alpha(theme.palette.primary.main, 0.3),
              animation: `float 6s ease-in-out infinite`,
              animationDelay: `${item.delay * 0.5}s`,
              '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                '50%': { transform: 'translateY(-20px) rotate(180deg)' },
              },
            }}
          >
            {item.icon}
          </Box>
        ))}
      </Box>

      {/* Main Brand Section */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <Fade in={true} timeout={2000}>
          <Box>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
                fontWeight: 900,
                background: `linear-gradient(135deg, 
                  ${theme.palette.primary.main} 0%, 
                  ${theme.palette.secondary.main} 50%,
                  ${theme.palette.primary.main} 100%
                )`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                opacity: 0.1,
                letterSpacing: '-0.02em',
                mb: 2,
              }}
            >
              TalkCart
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: '1rem', sm: '1.2rem', md: '1.5rem' },
                fontWeight: 600,
                color: alpha(theme.palette.text.primary, 0.15),
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Web3 Super Application
            </Typography>
          </Box>
        </Fade>
      </Box>

      {/* Mobile Feature Highlights */}
      <Box
        sx={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          right: '10%',
          display: { xs: 'flex', md: 'none' },
          flexDirection: 'column',
          gap: 2,
          pointerEvents: 'none',
        }}
      >
        {features.slice(0, 2).map((feature, index) => (
          <Fade
            key={`mobile-${feature.id}`}
            in={true}
            timeout={1500}
            style={{ transitionDelay: `${index * 300}ms` }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 3,
                py: 2,
                borderRadius: 3,
                background: `linear-gradient(135deg, 
                  ${alpha(feature.color, 0.08)} 0%, 
                  ${alpha(feature.color, 0.03)} 100%
                )`,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(feature.color, 0.15)}`,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: feature.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {React.cloneElement(feature.icon as React.ReactElement, { size: 20 })}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.text.primary,
                    fontSize: '0.9rem',
                    mb: 0.5,
                  }}
                >
                  {feature.title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: '0.75rem',
                    lineHeight: 1.3,
                  }}
                >
                  {feature.description.substring(0, 50)}...
                </Typography>
              </Box>
            </Box>
          </Fade>
        ))}
      </Box>

      {/* Stats Overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          display: 'flex',
          justifyContent: 'center',
          gap: { xs: 2, sm: 4 },
          pointerEvents: 'none',
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Active Users', value: '2.5M+', icon: <Users size={16} /> },
          { label: 'Transactions', value: '$50M+', icon: <TrendingUp size={16} /> },
          { label: 'Communities', value: '50K+', icon: <Globe size={16} /> },
        ].map((stat, index) => (
          <Fade
            key={index}
            in={true}
            timeout={1500}
            style={{ transitionDelay: `${index * 300}ms` }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: 2,
                background: alpha(theme.palette.background.paper, 0.1),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Box sx={{ color: theme.palette.primary.main }}>
                {stat.icon}
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: '0.7rem',
                    display: 'block',
                    lineHeight: 1,
                  }}
                >
                  {stat.label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.primary,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </Typography>
              </Box>
            </Box>
          </Fade>
        ))}
      </Box>
    </Box>
  );
}