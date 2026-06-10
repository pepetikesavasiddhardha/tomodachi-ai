import { Companion, Event, UserProfile } from '../types';

const firstNamesMale = ['Hiroshi', 'Kenji', 'Takashi', 'Akira', 'Taro', 'Jiro', 'Daiki', 'Ryota', 'Kenta', 'Satoshi', 'Makoto', 'Yoshi', 'Shohei', 'Nobu'];
const firstNamesFemale = ['Yoko', 'Sakura', 'Mei', 'Keiko', 'Haruka', 'Yui', 'Naomi', 'Ayumi', 'Chloe', 'Elena', 'Sophie', 'Anna', 'Maria', 'Yuki'];
const lastNames = ['Tanaka', 'Sato', 'Watanabe', 'Garcia', 'Ito', 'Chen', 'Nakamura', 'Yamamoto', 'Lin', 'Smith', 'Takahashi', 'Kim', 'Rossi', 'Kobayashi', 'Johnson', 'Suzuki', 'Zhang', 'Martin', 'Matsumoto', 'Inoue', 'Mendez', 'Kimura', 'Lee', 'Kowalski', 'Hayashi', 'Davis', 'Shimizu', 'Yamazaki', 'Brown'];
const locations = ['Shibuya, Tokyo', 'Kyoto', 'Shinjuku, Tokyo', 'Minato, Tokyo', 'Ueno, Tokyo', 'Yokohama', 'Setagaya, Tokyo', 'Asakusa, Tokyo', 'Ikebukuro, Tokyo', 'Roppongi, Tokyo', 'Kamakura', 'Shin-Okubo, Tokyo', 'Meguro, Tokyo', 'Chiba', 'Shimokitazawa, Tokyo', 'Nara', 'Chinatown, Yokohama', 'Kagurazaka, Tokyo', 'Saitama', 'Osaka', 'Kobe', 'Fukuoka', 'Sapporo', 'Hiroshima', 'Okinawa', 'Nagoya', 'Sendai', 'Hakodate'];
const interestsList = ['Gardening', 'Chess', 'Slow Walks', 'Tea Ceremony', 'Temple Visits', 'Reading', 'Photography', 'Nature', 'Coffee', 'Cooking', 'Language Exchange', 'Music', 'Calligraphy', 'Poetry', 'Classical Music', 'Technology', 'Volunteering', 'Movies', 'Knitting', 'Baking', 'Pets', 'History', 'Museums', 'Walking', 'Tai Chi', 'Mahjong', 'Golf', 'Wine Tasting', 'Jazz', 'Ikebana', 'Koto', 'Go', 'Hiking', 'Spicy Food', 'Painting', 'Fishing', 'Woodworking', 'Dogs', 'Yoga', 'Vegan Cooking', 'Meditation', 'Classic Cars', 'Rock Music', 'Origami', 'Haiku', 'Ping Pong', 'French Cinema', 'Shogi', 'Bonsai', 'Green Tea', 'Zumba', 'Karaoke', 'Travel', 'Salsa Dancing', 'Guitar', 'Pottery', 'Cycling', 'Book Club', 'Bird Watching'];

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomItems = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

export const generateCompanions = (count: number): Companion[] => {
    const companions: Companion[] = [];
    for (let i = 0; i < count; i++) {
        const isMale = Math.random() > 0.5;
        const firstName = isMale ? getRandomItem(firstNamesMale) : getRandomItem(firstNamesFemale);
        const lastName = getRandomItem(lastNames);
        const age = Math.floor(Math.random() * (90 - 60 + 1)) + 60; // 60 to 90
        const location = getRandomItem(locations);
        const interests = getRandomItems(interestsList, Math.floor(Math.random() * 3) + 2); // 2 to 4 interests
        
        const bioTemplates = [
            `I am a retired professional living in ${location}. I spend my days enjoying ${interests[0]} and ${interests[1]}. Looking for a friend to share these moments.`,
            `Hello! I'm ${firstName}. I love ${interests[0]} and am always up for ${interests[1]}. Let's connect if you share similar passions!`,
            `A quiet soul who finds joy in ${interests[0]}. I also dabble in ${interests[1]} and ${interests[2] || 'reading'}. Hoping to find a companion for gentle activities.`,
            `Very active for my age! You can usually find me doing ${interests[0]} or exploring ${location}. I also enjoy ${interests[1]} on quiet evenings.`,
            `I've lived in ${location} for many years. My main hobbies are ${interests.join(', ')}. I value deep conversations and good company.`
        ];

        companions.push({
            id: `gen_c_${Date.now()}_${i}`,
            name: `${firstName} ${lastName}`,
            age,
            interests,
            location,
            imageUrl: `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`,
            bio: getRandomItem(bioTemplates)
        });
    }
    return companions;
};

const eventAdjectives = ['Weekend', 'Morning', 'Evening', 'Beginner', 'Advanced', 'Community', 'Relaxing', 'Energetic', 'Social', 'Quiet', 'International', 'Local'];
const eventNouns = ['Gathering', 'Club', 'Meetup', 'Class', 'Workshop', 'Tour', 'Session', 'Social', 'Excursion', 'Night', 'Afternoon'];

export const generateEvents = (count: number): Event[] => {
    const events: Event[] = [];
    for (let i = 0; i < count; i++) {
        const interest = getRandomItem(interestsList);
        const adj = getRandomItem(eventAdjectives);
        const noun = getRandomItem(eventNouns);
        const location = getRandomItem(locations);
        const tags = getRandomItems(['Outdoors', 'Indoor', 'Social', 'Quiet', 'Active', 'Learning', 'Accessible', 'Small Group', 'Large Group'], 3);
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const times = ['9:00 AM', '10:30 AM', '1:00 PM', '3:00 PM', '6:00 PM', '7:30 PM'];
        const date = `Next ${getRandomItem(days)}, ${getRandomItem(times)}`;

        events.push({
            id: `gen_e_${Date.now()}_${i}`,
            title: `${adj} ${interest} ${noun}`,
            date,
            location,
            attendees: Math.floor(Math.random() * 25) + 3,
            imageUrl: `https://picsum.photos/400/200?random=${Math.floor(Math.random() * 1000)}`,
            description: `Join us in ${location} for a wonderful time focusing on ${interest}. This is a ${tags[0].toLowerCase()} event perfect for anyone looking to meet new people and enjoy a shared hobby.`,
            tags: [interest, ...tags]
        });
    }
    return events;
};

export const generateUsers = (count: number): (UserProfile & { password?: string })[] => {
    const users: (UserProfile & { password?: string })[] = [];
    for (let i = 0; i < count; i++) {
        const isMale = Math.random() > 0.5;
        const firstName = isMale ? getRandomItem(firstNamesMale) : getRandomItem(firstNamesFemale);
        const lastName = getRandomItem(lastNames);
        const age = Math.floor(Math.random() * (90 - 60 + 1)) + 60;
        const location = getRandomItem(locations);
        const interests = getRandomItems(interestsList, Math.floor(Math.random() * 3) + 2);

        users.push({
            email: `user${i + 1}@example.com`,
            password: 'password123', // Default password for all dummy users
            name: `${firstName} ${lastName}`,
            age,
            gender: isMale ? 'Male' : 'Female',
            location,
            bio: `I am a retired professional living in ${location}. I enjoy ${interests.join(' and ')}.`,
            summary: `A ${age}-year-old living in ${location} who enjoys ${interests.join(', ')}.`,
            interests
        });
    }
    return users;
};
