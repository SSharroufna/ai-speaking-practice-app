import { PracticeType, Level } from './types';

export const PRACTICE_TYPES: { id: PracticeType, name: string }[] = [
  { id: 'conversation', name: 'Conversation' },
  { id: 'image', name: 'Image Story' },
  { id: 'scenario', name: 'Role-play Scenario' },
];

export const LEVELS: { id: Level, name: string }[] = [
  { id: 'Beginner', name: 'Beginner' },
  { id: 'Intermediate', name: 'Intermediate' },
  { id: 'Advanced', name: 'Advanced' },
];

export const PROMPTS_BY_TOPIC: Record<string, Partial<Record<Level, string[]>>> = {
  "General": {
    "Beginner": [
      "Describe your favorite food.",
      "What did you do last weekend?",
      "Talk about your family.",
      "What is your favorite color and why?",
      "Describe your morning routine.",
    ],
    "Intermediate": [
      "Describe your favorite holiday. What makes it special to you?",
      "Talk about a book or movie that has had a big impact on you.",
      "What is a skill you would like to learn and why?",
      "Describe a perfect day from morning to night.",
      "Describe your hometown and what you like most about it.",
    ],
    "Advanced": [
      "If you could have any superpower, what would it be and why?",
      "Talk about a time you faced a challenge and how you overcame it.",
      "What are your goals for the next five years?",
      "If you could travel anywhere in the world, where would you go and what would you do?",
      "What does 'success' mean to you?",
    ],
  },
  "Work": {
    "Beginner": [
      "What is your job?",
      "Do you like your job? Why or why not?",
      "Describe your office or workplace.",
    ],
    "Intermediate": [
      "What is your dream job and why?",
      "Describe a typical day at your work or school.",
      "Talk about a project you are proud of.",
    ],
    "Advanced": [
      "What are the most important qualities for a good team leader?",
      "How do you handle stress or pressure at work?",
      "What is one career goal you are currently working towards?",
    ],
  },
  "Travel": {
    "Beginner": [
      "Have you ever been to another country?",
      "Where would you like to go on vacation?",
      "Do you prefer the beach or the mountains?",
    ],
    "Intermediate": [
      "Describe the most interesting place you have ever visited.",
      "Do you prefer traveling alone or with others? Why?",
      "Share a funny or memorable travel story.",
    ],
    "Advanced": [
      "What are the benefits of traveling?",
      "What's on your travel bucket list and what do you hope to gain from those experiences?",
      "If you had to live in another country for a year, where would you choose and why?",
    ],
  },
  "Technology": {
    "Beginner": [
      "What is your favorite app on your phone?",
      "Do you use a computer every day?",
      "How do you use technology to talk to your friends?",
    ],
    "Intermediate": [
      "What is a piece of technology you can't live without?",
      "How has technology changed the way you learn or work?",
      "Do you think social media is a positive or negative influence on society?",
    ],
    "Advanced": [
      "What are your thoughts on artificial intelligence and its future impact?",
      "Describe an app idea you have that could solve a common problem.",
      "What is the next big technological advancement you are excited about and what are its potential downsides?",
    ]
  }
};

export const IMAGE_PROMPTS: { content: string; imageUrl: string; level: Level }[] = [
  {
    content: 'Describe this image. What colors do you see? What objects are in the picture?',
    imageUrl: 'https://picsum.photos/seed/story1/800/400',
    level: 'Beginner',
  },
  {
    content: 'Imagine you are visiting this place. Describe what you see, hear, and feel. What would you do here?',
    imageUrl: 'https://picsum.photos/seed/travel2/800/400',
    level: 'Intermediate',
  },
  {
    content: 'What emotions does this image evoke? Describe the scene and analyze the mood conveyed by the artist.',
    imageUrl: 'https://picsum.photos/seed/mood3/800/400',
    level: 'Advanced',
  },
  {
    content: 'Create a simple conversation between two people who might be in this scene.',
    imageUrl: 'https://picsum.photos/seed/people4/800/400',
    level: 'Intermediate'
  }
];

export const SCENARIO_PROMPTS: { title: string; content: string; aiRole: string; level: Level }[] = [
  {
    title: 'Ordering Coffee',
    content: "You are at a coffee shop. Your goal is to order a large black coffee. Be polite.",
    aiRole: 'a friendly and helpful barista at a coffee shop',
    level: 'Beginner',
  },
  {
    title: 'Meeting a New Person',
    content: "You are at a party and you see someone you don't know. Start a conversation with them. Ask them about their hobbies and interests.",
    aiRole: 'a friendly person at a party who is open to a conversation',
    level: 'Intermediate',
  },
  {
    title: 'Job Interview Introduction',
    content: "You are in a job interview. The interviewer has just asked you to 'Tell me about yourself'. Introduce yourself, highlighting your key strengths and relevant experience for the role you're applying for.",
    aiRole: 'a hiring manager conducting a job interview',
    level: 'Advanced',
  },
  {
    title: 'Asking for Directions',
    content: "You are lost in a new city. Approach someone and ask for directions to the nearest train station. Be polite and clear.",
    aiRole: 'a helpful local who knows the city well',
    level: 'Intermediate'
  }
];


export const TOPICS = Object.keys(PROMPTS_BY_TOPIC);