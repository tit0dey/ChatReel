import { createEmptyStory, divider, message, uid } from '../lib/story';
import type { Story, StoryMessage } from '../types';

export interface StoryTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  contactName: string;
  senderName: string;
  messages: StoryMessage[];
}

const m = (side: 'sender' | 'receiver', text: string, sting = false) => message(side, text, { sting });
const d = (text: string) => divider(text);

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'horror-knock',
    name: 'Late-Night Horror Knock',
    description: 'A familiar ringtone. A knock that should not be there.',
    category: 'Horror',
    contactName: 'Maya',
    senderName: 'Noah',
    messages: [
      d('Today 2:13 AM'),
      m('receiver', 'Are you awake? Please answer.'),
      m('sender', 'I am now. What happened?'),
      m('receiver', 'Someone keeps knocking on my front door.'),
      m('sender', 'Do not open it. Call building security.'),
      m('receiver', 'I checked the camera. Nobody is there.'),
      d('37 seconds later'),
      m('receiver', 'Now they are knocking from inside my bedroom.', true),
      m('sender', 'Maya? Answer me.'),
    ],
  },
  {
    id: 'wrong-number',
    name: 'Wrong Number Plot Twist',
    description: 'A misdirected message becomes an impossible reunion.',
    category: 'Mystery',
    contactName: 'Unknown',
    senderName: 'Elena',
    messages: [
      d('Yesterday 9:41 PM'),
      m('receiver', 'Hey, did you bring my blue notebook?'),
      m('sender', 'I think you have the wrong number.'),
      m('receiver', 'Very funny, Elena.'),
      m('sender', 'How do you know my name?'),
      m('receiver', 'Because you have been my sister for twenty years.'),
      m('sender', 'My sister disappeared six years ago.'),
      d('Read 9:44 PM'),
      m('receiver', 'I know. I finally found my way back.', true),
    ],
  },
  {
    id: 'friend-prank',
    name: 'Best-Friend Prank',
    description: 'A harmless prank takes an unexpectedly sincere turn.',
    category: 'Comedy',
    contactName: 'Theo',
    senderName: 'Sam',
    messages: [
      d('Today 4:20 PM'),
      m('sender', 'I told the whole class about your secret.'),
      m('receiver', 'You would never dare.'),
      m('sender', 'Check the class group.'),
      m('receiver', 'There is nothing here.'),
      m('sender', 'Exactly. I told them individually.'),
      m('receiver', 'I am going to delete your number.'),
      m('sender', 'Relax. I only told them it is your birthday.'),
      m('receiver', 'My birthday is in December.', true),
    ],
  },
  {
    id: 'exam-leak',
    name: 'Exam Leak Cliffhanger',
    description: 'One anonymous file. One question nobody should know.',
    category: 'Thriller',
    contactName: 'Study Group',
    senderName: 'Nina',
    messages: [
      d('Exam night 1:06 AM'),
      m('receiver', 'Did anyone else receive that anonymous file?'),
      m('sender', 'The one named FINAL_QUESTIONS? Yes.'),
      m('receiver', 'Do not open it. It could be a virus.'),
      m('sender', 'Too late. Every question matches tomorrow’s paper.'),
      m('receiver', 'That is impossible. The paper was sealed today.'),
      d('New message'),
      m('receiver', 'There is a final page with your name on it.'),
      m('sender', 'What does it say?', true),
    ],
  },
  {
    id: 'secret-crush',
    name: 'Secret Crush Confession',
    description: 'Three years of almosts fit into one late-night message.',
    category: 'Romance',
    contactName: 'Avery',
    senderName: 'Jules',
    messages: [
      d('Friday 11:58 PM'),
      m('sender', 'Can I tell you something without making it weird?'),
      m('receiver', 'Now I am nervous. Go on.'),
      m('sender', 'I always take the long route home to walk with you.'),
      m('receiver', 'I thought you lived near the station.'),
      m('sender', 'I live in the opposite direction.'),
      m('receiver', 'For three years?'),
      m('sender', 'For three years.'),
      d('Typing for a moment'),
      m('receiver', 'Then tomorrow, let me take the long route with you.', true),
    ],
  },
  {
    id: 'bangla-thriller',
    name: 'Bangla Thriller Chat',
    description: 'বাংলা সাসপেন্স চ্যাট — একটি পরিচিত নম্বর, একটি অপরিচিত সত্য।',
    category: 'Bangla',
    contactName: 'রিয়া',
    senderName: 'অর্জুন',
    messages: [
      d('আজ রাত ১১:৪৮'),
      m('receiver', 'তুই কি এখন বাড়িতে আছিস?'),
      m('sender', 'হ্যাঁ, ছাদে দাঁড়িয়ে আছি। কেনো?'),
      m('receiver', 'তাহলে নিচে তোর ঘরের জানালায় কে দাঁড়িয়ে আছে?'),
      m('sender', 'কী বলছিস? আমি তো একাই বাড়িতে।'),
      m('receiver', 'আমি এখন তোর বাড়ির সামনে দাঁড়িয়ে আছি।'),
      d('১ মিনিট পর'),
      m('sender', 'রিয়া, তুই তো সাদা জামা পরেছিলি, তাই না?'),
      m('receiver', 'না। আমি তো লাল জামা পরে আছি।', true),
      m('sender', 'তাহলে সাদা জামাটা কে পরেছে?'),
    ],
  },
];

export function instantiateTemplate(template: StoryTemplate): Story {
  const base = createEmptyStory();
  return {
    ...base,
    id: uid(),
    name: template.name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: {
      ...base.settings,
      contactName: template.contactName,
      senderName: template.senderName,
      ambient: template.category === 'Comedy' || template.category === 'Romance' ? 'lofi' : 'suspense',
    },
    messages: template.messages.map((item) => ({ ...item, id: uid() })),
  };
}
