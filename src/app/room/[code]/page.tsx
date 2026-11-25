import { RoomClient } from '@/components/room-client';
export default async function Page({ params }: { params: Promise<{ code: string }> }) { return <RoomClient mode="player" code={(await params).code.toUpperCase()} />; }
