// A stand-in for the Claude Messages API, used only by the local e2e server.
// It reads the role ids the handler sent and answers with well-formed copy, so the
// real handler validation runs and the screen shows "AI-drafted" without any network.

export const STUB_PREFIX = 'E2E draft:';

function rolesFromRequest(init) {
  const request = JSON.parse(String(init && init.body));
  const content = request.messages[0].content;
  const input = JSON.parse(content.slice(content.indexOf('{')));
  return input.roles;
}

function draftFor(role) {
  return {
    role_id: role.role_id,
    one_liner: `${STUB_PREFIX} ${role.title} built on the work you already did.`,
    first_two_weeks: [
      `Write down two past projects that fit ${role.title}.`,
      'Share a short outline with one past client.',
    ],
    week: {
      actions: [
        { title: 'E2E action one: outline a past project', minutes: 30, day: 'Tue', short: 'Write one line about it.' },
        { title: 'E2E action two: draft a short offer', minutes: 25, day: 'Thu', short: 'Write only the subject line.' },
        { title: 'E2E action three: list your best questions', minutes: 20, day: 'Sat', short: 'Write three questions.' },
      ],
    },
    arc_12w: `Twelve weeks from a first outline to a first paid ${role.title} project.`,
  };
}

export async function fakeClaudeFetch(_url, init) {
  const roles = rolesFromRequest(init);
  const message = {
    type: 'message',
    role: 'assistant',
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify({ paths: roles.map(draftFor) }) }],
  };
  return new Response(JSON.stringify(message), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
