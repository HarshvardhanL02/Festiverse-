/**
 * Curated default library. Every entry is an upload on the rights holder's (or an official
 * broadcaster's / label's) own YouTube channel, verified on 2026-11-08 via YouTube oEmbed
 * (title + channel below are copied from that response, not invented).
 *
 * These are NOT licensed to Festiverse. They play only through YouTube's official embedded
 * player, so YouTube's terms and the owner's embedding settings apply; if an owner disables
 * embedding later, the player shows "Open on YouTube" instead.
 */
export type MusicCategory = 'hi' | 'mr' | 'en'

export interface LibrarySong {
  id: string
  category: MusicCategory
  title: string
  /** YouTube channel that uploaded it. */
  channel: string
  /** Marks the site owner's preferred track. */
  ownerPick?: boolean
}

export const OWNER_SONG_ID = 'mtdVqpPFJkk'

export const MUSIC_LIBRARY: LibrarySong[] = [
  // Marathi — owner's pick first
  {
    id: 'mtdVqpPFJkk',
    category: 'mr',
    title: 'Din Din Diwali - Diwali Anthem | Ft. @YashrajMukhateOfficial, Sarang Sathaye & @Moti-Soap',
    channel: 'Bharatiya Digital Party',
    ownerPick: true,
  },
  {
    id: 'WalCVptoorI',
    category: 'mr',
    title: 'आली माझ्या घरी ही दिवाळी | Aali Majhya Ghari Hi Diwali | Lata Mangeshkar',
    channel: 'Saregama Marathi',
  },
  {
    id: 'KxrY_nDXwTs',
    category: 'mr',
    title: 'मंगेशकरांची सुरेल दिवाळी | Marathi Diwali Songs | Lata Mangeshkar | Asha Bhosle | Usha Mangeshkar',
    channel: 'Saregama Marathi',
  },
  { id: 'Zg8INRJPOhA', category: 'mr', title: 'Din Din Diwali Song | Zee Marathi', channel: 'Zee Marathi' },

  // Hindi
  {
    id: 'WZEsOl2VuDA',
    category: 'hi',
    title: 'Hansraj Raghuwanshi - चौदह वर्ष में राम | Jai Shree Ram | Diwali Special Bhajan',
    channel: 'Hansraj Raghuwanshi',
  },
  {
    id: 'iNQSNNsP4EM',
    category: 'hi',
    title: 'Ram Ayodhya Aaye Hain | Kailash Kher | Aalok Shrivastav | Kshitij Tarey | Ram Mandir Song',
    channel: 'Doordarshan National',
  },
  {
    id: 'NZGNA7IT4PA',
    category: 'hi',
    title: 'Jalte Diye Full Song | Prem Ratan Dhan Payo | Salman Khan, Sonam Kapoor',
    channel: 'Rajshri',
  },

  // English / Instrumental
  {
    id: 'h5YsJKqv1Sg',
    category: 'en',
    title: 'Diwali and Deepavali Music • Festive Indian Cinematic Instrumentals',
    channel: 'Alec Koff Label',
  },
  {
    id: 'GNmpm4RAMWs',
    category: 'en',
    title: 'Musical Diwali | Pt. Ravi Shankar & Ustad Bismillah Khan | Sitar & Shehnai',
    channel: 'Saregama Hindustani Classical',
  },
  {
    id: 'TF9SeYts8zs',
    category: 'en',
    title: 'Deepawali Music Video - Sounds of Isha | Flute Instrumental | Folk Fusion',
    channel: 'Sadhguru',
  },
]

export const ownerSong = MUSIC_LIBRARY.find((s) => s.ownerPick)!
