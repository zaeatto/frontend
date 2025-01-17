import { BiSolidHome, BiSolidNotepad, BiSolidUserDetail } from "solid-icons/bi";
import {
  ComponentProps,
  Match,
  Show,
  Switch,
  createMemo,
  splitProps,
} from "solid-js";
import { styled } from "solid-styled-components";

import { VirtualContainer } from "@minht11/solid-virtual-container";
import { Channel } from "revolt.js";

import { useQuantity, useTranslation } from "@revolt/i18n";
import { TextWithEmoji } from "@revolt/markdown";
import { Link, useLocation, useNavigate } from "@revolt/routing";

import { Avatar } from "../../design/atoms/display/Avatar";
import { Typography } from "../../design/atoms/display/Typography";
import { UserStatusGraphic } from "../../design/atoms/indicators";
import { MenuButton } from "../../design/atoms/inputs/MenuButton";
import { Column } from "../../design/layout";
import { OverflowingText } from "../../design/layout/OverflowingText";
import { Tooltip } from "../../floating";
import { Deferred } from "../../tools";

import { SidebarBase } from "./common";

interface Props {
  /**
   * Ordered list of conversations
   */
  conversations: () => Channel[];

  /**
   * Current channel ID
   */
  channelId?: string;

  /**
   * Open the saved notes channel
   */
  openSavedNotes: (
    navigate?: ReturnType<typeof useNavigate>
  ) => string | undefined;

  /**
   * Whether to display friends menu
   */
  __tempDisplayFriends: () => boolean;
}

/**
 * Display home navigation and conversations
 */
export const HomeSidebar = (props: Props) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const savedNotesChannelId = createMemo(() => props.openSavedNotes());

  let scrollTargetElement!: HTMLDivElement;
  // TODO: need to create use:scrollable directive for styles

  return (
    <SidebarBase>
      <div
        ref={scrollTargetElement}
        style={{
          "overflow-y": "auto",
          "flex-grow": 1,
          "will-change": "transform",
        }}
      >
        <SidebarTitle>
          <Typography variant="sidebar-title">
            {t("app.main.categories.conversations")}
          </Typography>
        </SidebarTitle>
        <Link href="/">
          <MenuButton
            size="normal"
            icon={<BiSolidHome size={24} />}
            attention={location.pathname === "/" ? "active" : "normal"}
          >
            {t("app.navigation.tabs.home")}
          </MenuButton>
        </Link>
        <Show when={props.__tempDisplayFriends()}>
          <Link href="/friends">
            <MenuButton
              size="normal"
              icon={<BiSolidUserDetail size={24} />}
              attention={location.pathname === "/friends" ? "active" : "normal"}
            >
              {t("app.navigation.tabs.friends")}
            </MenuButton>
          </Link>
        </Show>
        <Switch
          fallback={
            <MenuButton
              size="normal"
              attention={"normal"}
              icon={<BiSolidNotepad size={24} />}
              // eslint-disable-next-line solid/reactivity
              onClick={() => props.openSavedNotes(navigate)}
            >
              {t("app.navigation.tabs.saved")}
            </MenuButton>
          }
        >
          <Match when={savedNotesChannelId()}>
            <Link href={`/channel/${savedNotesChannelId()}`}>
              <MenuButton
                size="normal"
                icon={<BiSolidNotepad size={24} />}
                attention={
                  props.channelId && savedNotesChannelId() === props.channelId
                    ? "active"
                    : "normal"
                }
              >
                {t("app.navigation.tabs.saved")}
              </MenuButton>
            </Link>
          </Match>
        </Switch>
        <Deferred>
          <VirtualContainer
            items={props.conversations()}
            scrollTarget={scrollTargetElement}
            itemSize={{ height: 48 }}
          >
            {(item) => (
              <div
                style={{ ...item.style, width: "100%", "padding-block": "3px" }}
              >
                <Entry
                  role="listitem"
                  tabIndex={item.tabIndex}
                  style={item.style}
                  channel={item.item}
                  active={item.item.id === props.channelId}
                />
              </div>
            )}
          </VirtualContainer>
        </Deferred>
      </div>
    </SidebarBase>
  );
};

/**
 * Sidebar title
 */
const SidebarTitle = styled.p`
  padding-inline: ${(props) => props.theme!.gap.md};
`;

/**
 * Single conversation entry
 */
function Entry(
  props: { channel: Channel; active: boolean } & Omit<
    ComponentProps<typeof Link>,
    "href"
  >
) {
  const [local, remote] = splitProps(props, ["channel", "active"]);

  const q = useQuantity();
  const t = useTranslation();

  /**
   * Determine user status if present
   */
  const status = () =>
    local.channel?.recipient
      ? local.channel.recipient?.status?.text ??
        local.channel.recipient?.status?.presence === "Focus"
        ? t("app.status.focus")
        : undefined
      : undefined;

  return (
    <Link {...remote} href={`/channel/${local.channel.id}`}>
      <MenuButton
        size="normal"
        alert={
          !local.active &&
          local.channel.unread &&
          (local.channel.mentions?.size || true)
        }
        attention={
          local.active ? "selected" : local.channel.unread ? "active" : "normal"
        }
        icon={
          <Switch>
            <Match when={local.channel.type === "Group"}>
              <Avatar
                size={32}
                fallback={local.channel.name}
                src={local.channel.iconURL}
              />
            </Match>
            <Match when={local.channel.type === "DirectMessage"}>
              <Avatar
                size={32}
                src={local.channel.iconURL}
                holepunch="bottom-right"
                overlay={
                  <UserStatusGraphic
                    status={
                      local.channel?.recipient?.status?.presence ?? "Invisible"
                    }
                  />
                }
              />
            </Match>
          </Switch>
        }
      >
        <Column gap="none">
          <Switch>
            <Match when={local.channel.type === "Group"}>
              <OverflowingText>
                <TextWithEmoji content={local.channel.name!} />
              </OverflowingText>
              <Typography variant="status">
                {q("members", local.channel.recipients.length || 0)}
              </Typography>
            </Match>
            <Match when={local.channel.type === "DirectMessage"}>
              <OverflowingText>
                {local.channel?.recipient?.username}
              </OverflowingText>
              <Show when={status}>
                <Tooltip content={status()!} placement="top-start">
                  {(triggerProps) => (
                    <OverflowingText>
                      <Typography {...triggerProps} variant="status">
                        <TextWithEmoji content={status()!} />
                      </Typography>
                    </OverflowingText>
                  )}
                </Tooltip>
              </Show>
            </Match>
          </Switch>
        </Column>
      </MenuButton>
    </Link>
  );
}
