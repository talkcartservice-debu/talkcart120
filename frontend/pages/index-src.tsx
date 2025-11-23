import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  useTheme,
  alpha,
} from '@mui/material';
import { 
  MessageSquare, 
  ShoppingBag, 
  Video, 
  Users, 
  Wallet, 
  ArrowRight 
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { FEATURES } from '@/config';

const HomePage: React.FC = () => {
  // Redirect to social feed
  const router = useRouter();

  useEffect(() => {
    router.replace('/social');
  }, [router]);

  // Return null since we're redirecting
  return null;
};

export default HomePage;