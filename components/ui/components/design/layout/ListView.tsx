import { JSX, createSignal, createUniqueId } from "solid-js";
import { styled } from "solid-styled-components";

import { ScrollContainer } from "../../common";

interface Props {
  /**
   * Space to leave at the top of the scroll container
   */
  offsetTop: number;

  /**
   * Handle when the top of the list is reached
   * @param reposition Scroll guard callback
   */
  fetchTop(reposition: (cb: () => void) => void): Promise<void>;

  /**
   * Handle when the bottom of the list is reached
   * @param reposition Scroll guard callback
   */
  fetchBottom(reposition: (cb: () => void) => void): Promise<void>;

  /**
   * Render the list itself
   */
  children: JSX.Element;
}

/**
 * Dynamic list view with ability to move through history
 *
 * This component only provides the scrolling behaviour
 */
export function ListView(props: Props) {
  const [fetching, setFetching] = createSignal(false);
  const id = createUniqueId();

  /**
   * Handle scroll event
   * @param event Event
   */
  function onScroll(event: UIEvent & { currentTarget: HTMLDivElement }) {
    if (fetching()) return;

    // Calculate our current position in the scroll container
    const scrollHeight = event.currentTarget.scrollHeight;
    const relativeY =
      event.currentTarget.scrollTop -
      event.currentTarget.getBoundingClientRect().height;
    const absoluteY = scrollHeight + relativeY;

    /**
     * Guard scroll position when rendering to DOM
     * @param cb Render callback
     * @param multiplier Direction multiplier
     */
    function scrollGuard(cb: () => void, multiplier = 1) {
      // Get initial state of scroll container
      const element = document.getElementById(id)!;
      const previousHeight = element.scrollHeight;
      const previousTop = element.scrollTop;

      // Render the new DOM nodes
      cb();

      // Offset the difference
      element.scrollBy({
        top:
          multiplier *
          (previousHeight -
            element.scrollHeight +
            previousTop -
            element.scrollTop),
      });
    }

    if (absoluteY <= props.offsetTop) {
      // Fetch upwards if we scroll to the top
      setFetching(true);
      props.fetchTop((cb) => scrollGuard(cb)).finally(() => setFetching(false));
    } else if (event.currentTarget.scrollTop === 0) {
      // Fetch downwards if we scroll to the bottom
      setFetching(true);
      props
        .fetchBottom((cb) => scrollGuard(cb, -1))
        .finally(() => setFetching(false));
    }
  }

  return (
    <Base
      id={id}
      offsetTop={props.offsetTop}
      scrollDirection="y"
      // eslint-disable-next-line solid/reactivity
      onScroll={onScroll}
    >
      <div>
        <div>{props.children}</div>
      </div>
    </Base>
  );
}

/**
 * Base list container
 * TODO: use directives instead =)
 */
const Base = styled(ScrollContainer)`
  flex-grow: 1;

  display: flex;
  flex-direction: column-reverse;

  > div {
    display: flex;
    padding-bottom: 24px;
    flex-direction: column-reverse;
  }
`;
