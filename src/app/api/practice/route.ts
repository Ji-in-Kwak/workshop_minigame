import { catalog } from '@/lib/server/catalog';
import { ok } from '@/lib/server/http';
export function GET() { return ok(catalog().filter(p => p.practice)); }
