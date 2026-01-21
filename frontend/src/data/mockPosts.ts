export interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    verified: boolean;
  };
  content: string;
  images?: string[];
  video?: string;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  trending?: boolean;
  favorite?: boolean;
  fromFollowing?: boolean;
  global?: boolean;
}

export const mockPosts: Post[] = [
  {
    id: '1',
    author: {
      id: 'user1',
      name: 'Alex Johnson',
      username: 'alexj',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      verified: true,
    },
    content: 'Just minted my first NFT collection on Vetora! Check it out in the marketplace. #NFT #DigitalArt #Web3',
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      'https://images.unsplash.com/photo-1626544827763-d516dce335e2'
    ],
    createdAt: '2023-06-15T14:23:00Z',
    likes: 245,
    comments: 42,
    shares: 18,
    liked: false,
    trending: true,
    fromFollowing: true,
    global: true
  },
  {
    id: '2',
    author: {
      id: 'user2',
      name: 'Sophia Chen',
      username: 'sophiac',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      verified: true,
    },
    content: 'Excited to announce our DAO is now live on Vetora! Join us in building the future of decentralized social media. 🚀 #DAO #Web3 #DecentralizedGovernance',
    createdAt: '2023-06-14T09:15:00Z',
    likes: 189,
    comments: 37,
    shares: 29,
    liked: true,
    favorite: true,
    global: true
  },
  {
    id: '3',
    author: {
      id: 'user3',
      name: 'Marcus Williams',
      username: 'marcusw',
      avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
      verified: false,
    },
    content: 'The latest DeFi integration on Vetora is a game-changer! Earning passive income while socializing is the future. What are your thoughts? #DeFi #PassiveIncome',
    createdAt: '2023-06-13T18:45:00Z',
    likes: 132,
    comments: 28,
    shares: 12,
    liked: false,
    trending: true,
    global: true
  },
  {
    id: '4',
    author: {
      id: 'user4',
      name: 'Emma Rodriguez',
      username: 'emmar',
      avatar: 'https://randomuser.me/api/portraits/women/29.jpg',
      verified: true,
    },
    content: 'Just completed my first crypto transaction using Vetora wallet. The UX is incredibly smooth! 💯 #Crypto #UserExperience',
    video: 'https://example.com/video1.mp4',
    createdAt: '2023-06-12T11:30:00Z',
    likes: 315,
    comments: 47,
    shares: 23,
    liked: true,
    favorite: true,
    fromFollowing: true
  },
  {
    id: '5',
    author: {
      id: 'user5',
      name: 'David Kim',
      username: 'davidk',
      avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
      verified: false,
    },
    content: 'Attended the Vetora virtual meetup yesterday. Amazing to see how the community is growing! Looking forward to the next one. #Community #VirtualEvents',
    images: [
      'https://images.unsplash.com/photo-1591115765373-5207764f72e7'
    ],
    createdAt: '2023-06-11T20:10:00Z',
    likes: 98,
    comments: 21,
    shares: 7,
    liked: false,
    fromFollowing: true
  },
  {
    id: '6',
    author: {
      id: 'user6',
      name: 'Olivia Taylor',
      username: 'oliviat',
      avatar: 'https://randomuser.me/api/portraits/women/17.jpg',
      verified: true,
    },
    content: 'Just published my article on the future of Web3 social platforms on Vetora\'s blog section. Would love your feedback! #Web3 #ContentCreation #Feedback',
    createdAt: '2023-06-10T15:55:00Z',
    likes: 276,
    comments: 63,
    shares: 41,
    liked: true,
    trending: true,
    favorite: true,
    fromFollowing: true,
    global: true,
  }
];