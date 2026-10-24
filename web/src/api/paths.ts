import type { Fields, PathsResponse } from '../state/types';

export interface PathsRequestRole {
  id: string;
  title: string;
  transfers: string[];
  missing: string[];
}

export interface PathsRequest {
  fields: Fields;
  roles: PathsRequestRole[];
}

// POST /api/paths. Placeholder until the paths screen task wires it up.
export async function fetchPaths(body: PathsRequest): Promise<PathsResponse> {
  void body;
  throw new Error('not implemented');
}
