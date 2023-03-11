import { BiRegularHash } from "solid-icons/bi";
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createSignal,
  on,
  onMount,
} from "solid-js";

import { API, Message as MessageI } from "revolt.js";

import { useClient } from "@revolt/client";
import { state } from "@revolt/state";
import {
  Avatar,
  Button,
  Column,
  Message,
  Row,
  Typography,
  styled,
} from "@revolt/ui";

const FixedColumn = styled(Column)`
  min-width: 0;
`;

const MutedList = styled(Column)`
  filter: brightness(0.5);
  flex-direction: column-reverse;
`;

function MessageSnapshot(props: {
  content: API.SnapshotWithContext["content"] & { _type: "Message" };
}) {
  const client = useClient();

  return (
    <>
      <MutedList>
        <For each={props.content._prior_context as unknown as MessageI[]}>
          {(message: MessageI) => (
            <Message message={client.messages.get(message._id)!} />
          )}
        </For>
      </MutedList>
      <Message message={client.messages.get(props.content._id)!} />
      <MutedList>
        <For each={props.content._leading_context as unknown as MessageI[]}>
          {(message) => <Message message={client.messages.get(message._id)!} />}
        </For>
      </MutedList>
    </>
  );
}

function Snapshot(props: { id: string }) {
  const client = useClient();
  const snapshot = () => state.admin.getSnapshot(props.id)!;
  const server = () =>
    snapshot().content._type === "Server"
      ? client.servers.get(snapshot().content._id)
      : client.servers.get(snapshot()._server?._id!);
  const author = () =>
    snapshot().content._type === "User"
      ? client.users.get(snapshot().content._id)
      : client.users.get(
          (
            snapshot().content as API.SnapshotContent & {
              _type: "Message";
            }
          )?.author
        )!;
  const channel = () =>
    client.channels.get(
      (
        snapshot().content as API.SnapshotContent & {
          _type: "Message";
        }
      )?.channel
    )!;

  return (
    <FixedColumn>
      <Typography variant="label">Snapshot Context</Typography>
      <Row>
        <Show when={server()}>
          <Column justify>
            <Typography variant="legacy-settings-description">
              <Switch fallback={"Server"}>
                <Match when={snapshot().content._type === "Server"}>
                  Reported Server
                </Match>
              </Switch>
            </Typography>
            <Button
              compact="fluid"
              onClick={() =>
                state.admin.addTab({
                  type: "inspector",
                  title: server()!.name,
                  id: server()!._id,
                  typeHint: "server",
                })
              }
            >
              <Row align>
                <Avatar src={server()!.generateIconURL()} size={64} />
                <span>{server()!.name}</span>
              </Row>
            </Button>
          </Column>
        </Show>
        <Show when={channel()}>
          <Column justify>
            <Typography variant="legacy-settings-description">
              Channel
            </Typography>
            <Button
              compact="fluid"
              onClick={() =>
                state.admin.addTab({
                  type: "inspector",
                  title: channel().name ?? channel().channel_type,
                  id: channel()._id,
                  typeHint: "channel",
                })
              }
            >
              <Row align>
                <Avatar
                  src={channel().generateIconURL()}
                  fallback={<BiRegularHash size={24} />}
                  size={64}
                />
                <span>{channel()!.name ?? channel().channel_type}</span>
              </Row>
            </Button>
          </Column>
        </Show>
        <Show when={author()}>
          <Column justify>
            <Typography variant="legacy-settings-description">
              <Switch fallback={"Author"}>
                <Match when={snapshot().content._type === "User"}>
                  Reported User
                </Match>
              </Switch>
            </Typography>
            <Button
              compact="fluid"
              onClick={() => {
                state.admin.addTab({
                  type: "inspector",
                  title: `@${author()!.username}`,
                  id: author()!._id,
                  typeHint: "user",
                });
                /*const message = (snapshot().content as (API.SnapshotContent & { _type: 'Message' }));
                state.admin.addTab({
                  type: "inspector",
                  title: 'Message ' + message._id.substring(20, 26),
                  id: message._id,
                  typeHint: "message",
                })*/
              }}
            >
              <Row align>
                <Avatar src={author()!.animatedAvatarURL} size={64} />
                <span>{author()!.username}</span>
              </Row>
            </Button>
          </Column>
        </Show>
      </Row>
      <Switch>
        <Match when={snapshot().content._type === "Message"}>
          <Typography variant="label">Content</Typography>
          <MessageSnapshot content={snapshot().content as any} />
        </Match>
      </Switch>
    </FixedColumn>
  );
}

export function Report() {
  const data = () => state.admin.getActiveTab<"report">()!;
  const report = () => state.admin.getReport(data().id);
  const snapshot = () => state.admin.getSnapshot(data().id)!;

  const [notes, setNotes] = createSignal<string>();

  return (
    <Show when={report()}>
      <Column>
        <Typography variant="legacy-settings-title">
          Report ({report()!.status}){" "}
          {report()!.status === "Rejected" && report()!.rejection_reason}
        </Typography>
        <Row>
          <Typography variant="legacy-modal-title">
            {report()!.content.report_reason}
          </Typography>
          <Typography variant="legacy-modal-title-2">
            {report()!.additional_context}
          </Typography>
        </Row>
        <textarea
          value={report()!.notes ?? notes() ?? ""}
          onInput={(ev) => setNotes(ev.currentTarget.value)}
        />
        <Button
          palette="primary"
          disabled={notes() === report()!.notes}
          onClick={() =>
            state.admin.editReport(data().id, {
              notes: notes(),
            })
          }
        >
          Save
        </Button>
        <Switch
          fallback={
            <Button
              palette="warning"
              onClick={() =>
                state.admin.editReport(data().id, {
                  status: {
                    status: "Created",
                  },
                })
              }
            >
              Mark as created
            </Button>
          }
        >
          <Match when={report()!.status === "Created"}>
            <Button
              palette="success"
              onClick={() =>
                state.admin.editReport(data().id, {
                  status: {
                    status: "Resolved",
                  },
                })
              }
            >
              Mark as resolved
            </Button>
            <Button
              palette="error"
              onClick={() => {
                const rejection_reason = prompt("Rejection reason");
                if (rejection_reason) {
                  state.admin.editReport(data().id, {
                    status: {
                      status: "Rejected",
                      rejection_reason,
                    },
                  });
                }
              }}
            >
              Mark as rejected
            </Button>
          </Match>
        </Switch>
        <span style="color: white">
          <Show when={snapshot()}>
            <Snapshot id={data().id} />
          </Show>
        </span>
      </Column>
    </Show>
  );
}
