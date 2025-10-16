import { PracticeType } from './types';

export const PRACTICE_TYPES: { id: PracticeType, name: string }[] = [
  { id: 'conversation', name: 'Conversation' },
  { id: 'image', name: 'Image Story' },
  { id: 'scenario', name: 'Role-play Scenario' },
];

export const PROMPTS_BY_TOPIC: Record<string, string[]> = {
  "General": [
    "Describe your favorite holiday. What makes it special to you?",
    "If you could have any superpower, what would it be and why?",
    "Talk about a book or movie that has had a big impact on you.",
    "What is a skill you would like to learn and why?",
    "Describe a perfect day from morning to night.",
    "Talk about a time you faced a challenge and how you overcame it.",
    "What are your goals for the next five years?",
    "Describe your hometown and what you like most about it.",
    "If you could travel anywhere in the world, where would you go and what would you do?",
    "What does 'success' mean to you?"
  ],
  "Work": [
    "What is your dream job and why?",
    "Describe a typical day at your work or school.",
    "What are the most important qualities for a good team leader?",
    "Talk about a project you are proud of.",
    "How do you handle stress or pressure at work?",
    "What is one career goal you are currently working towards?"
  ],
  "Travel": [
    "Describe the most interesting place you have ever visited.",
    "What are the benefits of traveling?",
    "Do you prefer traveling alone or with others? Why?",
    "What's on your travel bucket list?",
    "Share a funny or memorable travel story.",
    "If you had to live in another country for a year, where would you choose and why?"
  ],
  "Technology": [
      "What is a piece of technology you can't live without?",
      "How has technology changed the way you learn or work?",
      "What are your thoughts on artificial intelligence?",
      "Do you think social media is a positive or negative influence on society?",
      "Describe an app idea you have.",
      "What is the next big technological advancement you are excited about?"
  ]
};

export const IMAGE_PROMPTS = [
  {
    content: 'Describe this image in detail. What do you think is happening? Create a short story about it.',
    imageUrl: 'https://picsum.photos/seed/story1/800/400',
  },
  {
    content: 'Imagine you are visiting this place. Describe what you see, hear, and feel. What would you do here?',
    imageUrl: 'https://picsum.photos/seed/travel2/800/400',
  },
  {
    content: 'What emotions does this image evoke? Describe the scene and the mood.',
    imageUrl: 'https://picsum.photos/seed/mood3/800/400',
  },
  {
    content: 'Create a conversation between two people who might be in this scene.',
    imageUrl: 'https://picsum.photos/seed/people4/800/400',
  }
];

export const SCENARIO_PROMPTS = [
  {
    title: 'Ordering Coffee',
    content: "You are at a coffee shop. Your goal is to order a drink and a pastry. You can ask the barista for recommendations.",
    aiRole: 'a friendly and helpful barista at a coffee shop',
  },
  {
    title: 'Job Interview Introduction',
    content: "You are in a job interview. The interviewer has just asked you to 'Tell me about yourself'. Introduce yourself, highlighting your strengths and experience for the role.",
    aiRole: 'a hiring manager conducting a job interview',
  },
  {
    title: 'Meeting a New Person',
    content: "You are at a party and you see someone you don't know. Start a conversation with them. Ask them about their hobbies and interests.",
    aiRole: 'a friendly person at a party who is open to a conversation',
  },
  {
    title: 'Asking for Directions',
    content: "You are lost in a new city. Approach someone and ask for directions to the nearest train station. Be polite and clear.",
    aiRole: 'a helpful local who knows the city well',
  }
];


export const TOPICS = Object.keys(PROMPTS_BY_TOPIC);
