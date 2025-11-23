export interface SocialPost {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    verified: boolean;
  };
  createdAt: string;
  media?: {
    id: string;
    resource_type: 'image' | 'video' | 'audio';
    secure_url: string;
    format: string;
    width?: number;
    height?: number;
    duration?: number;
  }[];
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  bookmarked: boolean;
  tags?: string[];
  location?: string;
  privacy: 'public' | 'followers' | 'private';
}

export const mockSocialPosts: SocialPost[] = [
  {
    id: '1',
    content: 'Just minted my first NFT collection on TalkCart! Check it out in the marketplace. #NFT #DigitalArt #Web3',
    author: {
      id: 'user1',
      name: 'Alex Johnson',
      username: 'alexj',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      verified: true,
    },
    createdAt: '2023-06-15T14:23:00Z',
    media: [
      {
        id: 'media1',
        resource_type: 'image',
        secure_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
        format: 'jpg',
        width: 1200,
        height: 800
      },
      {
        id: 'media2',
        resource_type: 'image',
        secure_url: 'https://images.unsplash.com/photo-1626544827763-d516dce335e2',
        format: 'jpg',
        width: 1200,
        height: 800
      }
    ],
    likes: 245,
    comments: 42,
    shares: 18,
    liked: false,
    bookmarked: false,
    tags: ['NFT', 'DigitalArt', 'Web3'],
    privacy: 'public'
  },
  {
    id: '2',
    content: 'Excited to announce our DAO is now live on TalkCart! Join us in building the future of decentralized social media. 🚀 #DAO #Web3 #DecentralizedGovernance',
    author: {
      id: 'user2',
      name: 'Sophia Chen',
      username: 'sophiac',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      verified: true,
    },
    createdAt: '2023-06-14T09:15:00Z',
    likes: 189,
    comments: 37,
    shares: 29,
    liked: true,
    bookmarked: true,
    tags: ['DAO', 'Web3', 'DecentralizedGovernance'],
    privacy: 'public'
  },
  {
    id: '3',
    content: 'The latest DeFi integration on TalkCart is a game-changer! Earning passive income while socializing is the future. What are your thoughts? #DeFi #PassiveIncome',
    author: {
      id: 'user3',
      name: 'Marcus Williams',
      username: 'marcusw',
      avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
      verified: false,
    },
    createdAt: '2023-06-13T18:45:00Z',
    likes: 132,
    comments: 28,
    shares: 12,
    liked: false,
    bookmarked: false,
    tags: ['DeFi', 'PassiveIncome'],
    privacy: 'public'
  },
  {
    id: '4',
    content: 'Just completed my first crypto transaction using TalkCart wallet. The UX is incredibly smooth! 💯 #Crypto #UserExperience',
    author: {
      id: 'user4',
      name: 'Emma Rodriguez',
      username: 'emmar',
      avatar: 'https://randomuser.me/api/portraits/women/29.jpg',
      verified: true,
    },
    createdAt: '2023-06-12T11:30:00Z',
    media: [
      {
        id: 'media3',
        resource_type: 'video',
        secure_url: 'https://example.com/video1.mp4',
        format: 'mp4',
        duration: 120
      }
    ],
    likes: 315,
    comments: 47,
    shares: 23,
    liked: true,
    bookmarked: false,
    tags: ['Crypto', 'UserExperience'],
    privacy: 'followers'
  },
  {
    id: '5',
    content: 'Attended the TalkCart virtual meetup yesterday. Amazing to see how the community is growing! Looking forward to the next one. #Community #VirtualEvents',
    author: {
      id: 'user5',
      name: 'David Kim',
      username: 'davidk',
      avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
      verified: false,
    },
    createdAt: '2023-06-11T20:10:00Z',
    media: [
      {
        id: 'media4',
        resource_type: 'image',
        secure_url: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7',
        format: 'jpg',
        width: 1200,
        height: 800
      }
    ],
    likes: 98,
    comments: 21,
    shares: 7,
    liked: false,
    bookmarked: false,
    tags: ['Community', 'VirtualEvents'],
    privacy: 'public'
  },
  {
    id: '6',
    content: 'Just published my article on the future of Web3 social platforms on TalkCart\'s blog section. Would love your feedback! #Web3 #ContentCreation #Feedback',
    author: {
      id: 'user6',
      name: 'Olivia Taylor',
      username: 'oliviat',
      avatar: 'https://randomuser.me/api/portraits/women/17.jpg',
      verified: true,
    },
    createdAt: '2023-06-10T15:55:00Z',
    likes: 276,
    comments: 63,
    shares: 41,
    liked: true,
    bookmarked: true,
    tags: ['Web3', 'ContentCreation', 'Feedback'],
    privacy: 'public'
  }
];