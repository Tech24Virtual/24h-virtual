import React from 'react';
import { FileText, ExternalLink, Image as ImageIcon } from 'lucide-react';

// Common Slack emoji shortcodes → Unicode
const emojiMap: Record<string, string> = {
  ':smile:': '😄', ':laughing:': '😆', ':blush:': '😊', ':smiley:': '😃',
  ':relaxed:': '☺️', ':smirk:': '😏', ':heart_eyes:': '😍', ':kissing_heart:': '😘',
  ':kissing:': '😗', ':flushed:': '😳', ':relieved:': '😌', ':satisfied:': '😆',
  ':grin:': '😁', ':wink:': '😉', ':stuck_out_tongue_winking_eye:': '😜',
  ':stuck_out_tongue_closed_eyes:': '😝', ':stuck_out_tongue:': '😛',
  ':sleeping:': '😴', ':worried:': '😟', ':frowning:': '😦', ':anguished:': '😧',
  ':open_mouth:': '😮', ':grimacing:': '😬', ':confused:': '😕', ':hushed:': '😯',
  ':expressionless:': '😑', ':unamused:': '😒', ':sweat_smile:': '😅',
  ':sweat:': '😓', ':disappointed_relieved:': '😥', ':weary:': '😩',
  ':pensive:': '😔', ':disappointed:': '😞', ':confounded:': '😖', ':fearful:': '😨',
  ':cold_sweat:': '😰', ':persevere:': '😣', ':cry:': '😢', ':sob:': '😭',
  ':joy:': '😂', ':astonished:': '😲', ':scream:': '😱', ':tired_face:': '😫',
  ':angry:': '😠', ':rage:': '😡', ':triumph:': '😤', ':sleepy:': '😪',
  ':yum:': '😋', ':mask:': '😷', ':sunglasses:': '😎', ':dizzy_face:': '😵',
  ':imp:': '👿', ':neutral_face:': '😐', ':no_mouth:': '😶', ':innocent:': '😇',
  ':alien:': '👽', ':yellow_heart:': '💛', ':blue_heart:': '💙', ':purple_heart:': '💜',
  ':heart:': '❤️', ':green_heart:': '💚', ':broken_heart:': '💔',
  ':heartbeat:': '💓', ':heartpulse:': '💗', ':two_hearts:': '💕',
  ':sparkling_heart:': '💖', ':star:': '⭐', ':star2:': '🌟', ':dizzy:': '💫',
  ':boom:': '💥', ':fire:': '🔥', ':sparkles:': '✨', ':thumbsup:': '👍',
  ':thumbs_up:': '👍', ':+1:': '👍', ':thumbsdown:': '👎', ':-1:': '👎',
  ':ok_hand:': '👌', ':punch:': '👊', ':fist:': '✊', ':v:': '✌️',
  ':wave:': '👋', ':hand:': '✋', ':open_hands:': '👐', ':point_up:': '☝️',
  ':point_down:': '👇', ':point_left:': '👈', ':point_right:': '👉',
  ':raised_hands:': '🙌', ':pray:': '🙏', ':clap:': '👏', ':muscle:': '💪',
  ':metal:': '🤘', ':walking:': '🚶', ':runner:': '🏃', ':couple:': '👫',
  ':family:': '👪', ':dancers:': '👯', ':bow:': '🙇', ':ok_woman:': '🙆',
  ':no_good:': '🙅', ':raising_hand:': '🙋', ':person_frowning:': '🙍',
  ':eyes:': '👀', ':tongue:': '👅', ':nose:': '👃', ':ear:': '👂',
  ':dog:': '🐶', ':cat:': '🐱', ':mouse:': '🐭', ':hamster:': '🐹',
  ':rabbit:': '🐰', ':wolf:': '🐺', ':frog:': '🐸', ':tiger:': '🐯',
  ':koala:': '🐨', ':bear:': '🐻', ':pig:': '🐷', ':cow:': '🐮',
  ':boar:': '🐗', ':monkey_face:': '🐵', ':monkey:': '🐒', ':horse:': '🐴',
  ':snake:': '🐍', ':bird:': '🐦', ':chicken:': '🐔', ':penguin:': '🐧',
  ':bug:': '🐛', ':octopus:': '🐙', ':fish:': '🐟', ':whale:': '🐳',
  ':sun_with_face:': '🌞', ':sunny:': '☀️', ':cloud:': '☁️',
  ':umbrella:': '☂️', ':snowflake:': '❄️', ':zap:': '⚡', ':cyclone:': '🌀',
  ':rocket:': '🚀', ':airplane:': '✈️', ':tada:': '🎉', ':confetti_ball:': '🎊',
  ':balloon:': '🎈', ':gift:': '🎁', ':bell:': '🔔', ':gem:': '💎',
  ':100:': '💯', ':white_check_mark:': '✅', ':x:': '❌', ':warning:': '⚠️',
  ':no_entry:': '⛔', ':question:': '❓', ':exclamation:': '❗',
  ':heavy_check_mark:': '✔️', ':heavy_plus_sign:': '➕',
  ':heavy_minus_sign:': '➖', ':heavy_multiplication_x:': '✖️',
  ':pencil:': '✏️', ':memo:': '📝', ':email:': '📧', ':phone:': '📱',
  ':telephone_receiver:': '📞', ':computer:': '💻', ':bulb:': '💡',
  ':wrench:': '🔧', ':hammer:': '🔨', ':lock:': '🔒', ':key:': '🔑',
  ':mag:': '🔍', ':link:': '🔗', ':calendar:': '📅', ':clock1:': '🕐',
  ':hourglass:': '⌛', ':chart_with_upwards_trend:': '📈',
  ':chart_with_downwards_trend:': '📉', ':moneybag:': '💰',
  ':dollar:': '💵', ':credit_card:': '💳', ':trophy:': '🏆',
  ':speech_balloon:': '💬', ':thought_balloon:': '💭',
  ':slightly_smiling_face:': '🙂', ':upside_down_face:': '🙃',
  ':thinking_face:': '🤔', ':thinking:': '🤔', ':rofl:': '🤣',
  ':face_with_rolling_eyes:': '🙄', ':shrug:': '🤷',
  ':man_shrugging:': '🤷‍♂️', ':woman_shrugging:': '🤷‍♀️',
  ':raised_hand:': '✋', ':handshake:': '🤝', ':crossed_fingers:': '🤞',
  ':palms_up_together:': '🤲', ':skull:': '💀', ':robot_face:': '🤖',
  ':see_no_evil:': '🙈', ':hear_no_evil:': '🙉', ':speak_no_evil:': '🙊',
  ':poop:': '💩', ':ghost:': '👻', ':skull_and_crossbones:': '☠️',
  ':coffee:': '☕', ':pizza:': '🍕', ':hamburger:': '🍔', ':beer:': '🍺',
  ':wine_glass:': '🍷', ':cake:': '🎂', ':apple:': '🍎',
  ':checkered_flag:': '🏁', ':flag-us:': '🇺🇸', ':flag-ca:': '🇨🇦',
};

interface SlackMessageContentProps {
  text: string;
}

// Parse and render Slack message content with emojis, links, file badges, and images
export function SlackMessageContent({ text }: SlackMessageContentProps) {
  const elements = parseSlackMessage(text);
  return <span className="whitespace-pre-wrap break-words">{elements}</span>;
}

type ParsedNode =
  | { type: 'text'; value: string }
  | { type: 'link'; url: string; label: string }
  | { type: 'file'; name: string; url: string }
  | { type: 'image'; url: string; alt: string };

function parseSlackMessage(text: string): React.ReactNode[] {
  // Step 1: Extract markdown images ![alt](url)
  // Step 2: Extract Slack links <url|label> and <url>
  // Step 3: Extract [File: name](url) patterns
  // Step 4: Auto-linkify remaining URLs
  // Step 5: Convert emoji shortcodes

  const nodes: ParsedNode[] = [];
  let remaining = text;

  // Combined regex for all special patterns
  const combinedPattern = /!\[([^\]]*)\]\(([^)]+)\)|\[File:\s*([^\]]+)\]\(([^)]+)\)|<([^|>]+)\|([^>]+)>|<(https?:\/\/[^>]+)>|(https?:\/\/[^\s<]+)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedPattern.exec(remaining)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', value: remaining.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined && match[2]) {
      // Markdown image: ![alt](url)
      nodes.push({ type: 'image', alt: match[1] || 'Screenshot', url: match[2] });
    } else if (match[3] && match[4]) {
      // File reference: [File: name](url)
      nodes.push({ type: 'file', name: match[3].trim(), url: match[4] });
    } else if (match[5] && match[6]) {
      // Slack link with label: <url|label>
      nodes.push({ type: 'link', url: match[5], label: match[6] });
    } else if (match[7]) {
      // Slack link without label: <url>
      nodes.push({ type: 'link', url: match[7], label: match[7] });
    } else if (match[8]) {
      // Auto-detected URL — render as image if it ends with an image extension
      const imageExtPattern = /\.(png|jpe?g|gif|webp)(\?.*)?$/i;
      if (imageExtPattern.test(match[8])) {
        nodes.push({ type: 'image', alt: 'Screenshot', url: match[8] });
      } else {
        nodes.push({ type: 'link', url: match[8], label: match[8] });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < remaining.length) {
    nodes.push({ type: 'text', value: remaining.slice(lastIndex) });
  }

  // Render nodes
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return <React.Fragment key={i}>{convertEmojis(node.value)}</React.Fragment>;
      case 'link':
        return (
          <a
            key={i}
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:opacity-80 inline-flex items-center gap-0.5"
          >
            {truncateUrl(node.label)}
            <ExternalLink className="h-3 w-3 inline shrink-0" />
          </a>
        );
      case 'file':
        return (
          <a
            key={i}
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-muted px-2 py-1 rounded text-xs font-medium hover:bg-muted/80 transition-colors my-0.5"
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate max-w-[200px]">{node.name}</span>
          </a>
        );
      case 'image':
        return (
          <div key={i} className="my-1.5">
            <a href={node.url} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={node.url}
                alt={node.alt}
                className="max-w-full max-h-[300px] rounded-md border object-contain cursor-pointer hover:opacity-90 transition-opacity"
                loading="lazy"
              />
            </a>
          </div>
        );
      default:
        return null;
    }
  });
}

function convertEmojis(text: string): string {
  return text.replace(/:[a-z0-9_+-]+:/g, (match) => emojiMap[match] || match);
}

function truncateUrl(url: string): string {
  if (url.length > 50) {
    return url.slice(0, 47) + '...';
  }
  return url;
}
