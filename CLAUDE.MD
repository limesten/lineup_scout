# Project Overview

Tomorrowland lineup explorer. View Lineup based on year, weekend and date.
User can view lineup in Grid view or Timetable view.

Unique feature: User can press an artist name to get a spotify iframe for that artist with their top songs. The purpose is to quickly be able to get a feel for the type of music that artist produces to get a sense if that is a set you want to be at or not during the festival. This helps plan the visit for each festival goer.

# Tech Stack

pnpm
shadcn UI
next.js
tailwindcss
postgres with neon
drizzle ORM
vercel

# Architecture Notes

Use shadcn UI components whenever possible. Before creating a new component, search if shadcn ui component can be imported instead.

# Rules

Run pnpm run build before finishing to make sure there are no build errors.
