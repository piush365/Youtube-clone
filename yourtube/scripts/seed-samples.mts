// Seeds the fixed set of demo videos under the "Siddhi Bolaikar" channel.
// Safe to re-run: documents have fixed ids, and existing views/likes are kept.
//
//   npm run seed:samples        (uses the Admin credentials in .env.local)
//
// The files already live on Cloudinary; only Firestore is written.
import { FieldValue } from "firebase-admin/firestore";

const { adminDb } = await import("../src/lib/server/firebaseAdmin");

const CHANNEL_ID = "sample-siddhi-bolaikar";
const CHANNEL = {
  channelname: "Siddhi Bolaikar",
  name: "Siddhi Bolaikar",
  description: "Sample videos for the YourTube demo.",
  image: "",
};

const CLOUD = "https://res.cloudinary.com/dsdyrj0c9/video/upload";

const SAMPLES = [
  { id: "sample-big-buck-bunny", title: "Big Buck Bunny (Blender open movie, CC-BY)", file: "v1790832411/uscmqsajvn2vbenb4xvn.mp4", filename: "BigBuckBunny_320x180.mp4", size: "62MB", duration: 596 },
  { id: "sample-sintel-trailer", title: "Sintel - Official Trailer (Blender, CC-BY)", file: "v1790832454/akkapvuemsfzhdue5ptd.mp4", filename: "sintel_trailer-480p.mp4", size: "4MB", duration: 52 },
  { id: "sample-elephants", title: "Elephants in the Wild", file: "v1790832426/a2fckjpjhlbmtwowwobz.mp4", filename: "elephants.mp4", size: "39MB", duration: 53 },
  { id: "sample-sea-turtle", title: "Sea Turtle Swimming", file: "v1790832429/qmyfgseizk0mr0hwftqg.mp4", filename: "sea_turtle.mp4", size: "27MB", duration: 15 },
  { id: "sample-happy-dog", title: "Happy Dog", file: "v1790832431/rcoxnl15tvi5lwzedwln.mp4", filename: "dog.mp4", size: "9MB", duration: 13 },
];

const db = adminDb();
const batch = db.batch();
batch.set(db.collection("channels").doc(CHANNEL_ID), CHANNEL);

for (const s of SAMPLES) {
  const ref = db.collection("videos").doc(s.id);
  const existing = await ref.get();
  batch.set(
    ref,
    {
      videotitle: s.title,
      filename: s.filename,
      filetype: "video/mp4",
      videoUrl: `${CLOUD}/${s.file}`,
      filesize: s.size,
      duration: s.duration,
      videochanel: CHANNEL.channelname,
      uploader: CHANNEL_ID,
      // First run only: don't reset counters on a re-seed.
      ...(!existing.exists && { likes: 0, views: 0, createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true }
  );
}

// Older copies of these files uploaded with random ids (same Cloudinary URL).
const urls = new Set(SAMPLES.map((s) => `${CLOUD}/${s.file}`));
const ids = new Set(SAMPLES.map((s) => s.id));
for (const d of (await db.collection("videos").get()).docs) {
  if (!ids.has(d.id) && urls.has(d.get("videoUrl"))) {
    batch.delete(d.ref);
    console.log("removing duplicate", d.id, d.get("videotitle"));
  }
}

await batch.commit();
console.log(`Seeded ${SAMPLES.length} sample videos on channel "${CHANNEL.channelname}" (/channel/${CHANNEL_ID}).`);
