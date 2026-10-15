# Optimized Website

As a senior web developer you'll create a performant and optimized website.

## Goal

Create a website properly performed and optimized, in order to avoid using recurrent server calls and use the browser cache.

## Topic

The website topic is about a fan page of Max Payne

## Styles

- Theme:
  - Noir NY Like
  - Dark ambiance comic like

__Mix both__

- Animation:
  - Rain
  - Snow

__Switch between both weathers smoothly__

- Colors:

```css
/* CSS HEX */
--coffee-bean: #240d12ff;
--brick-red: #af1020ff;
--charcoal: #5b5f62ff;
--amber-honey: #e2a51eff;
--vanilla-custard: #d9d89fff;

/* CSS HSL */
--coffee-bean: hsla(347, 47%, 10%, 1);
--brick-red: hsla(354, 83%, 37%, 1);
--charcoal: hsla(206, 4%, 37%, 1);
--amber-honey: hsla(41, 77%, 50%, 1);
--vanilla-custard: hsla(59, 43%, 74%, 1);

/* SCSS HEX */
$coffee-bean: #240d12ff;
$brick-red: #af1020ff;
$charcoal: #5b5f62ff;
$amber-honey: #e2a51eff;
$vanilla-custard: #d9d89fff;

/* SCSS HSL */
$coffee-bean: hsla(347, 47%, 10%, 1);
$brick-red: hsla(354, 83%, 37%, 1);
$charcoal: hsla(206, 4%, 37%, 1);
$amber-honey: hsla(41, 77%, 50%, 1);
$vanilla-custard: hsla(59, 43%, 74%, 1);

/* SCSS RGB */
$coffee-bean: rgba(36, 13, 18, 1);
$brick-red: rgba(175, 16, 32, 1);
$charcoal: rgba(91, 95, 98, 1);
$amber-honey: rgba(226, 165, 30, 1);
$vanilla-custard: rgba(217, 216, 159, 1);

/* SCSS Gradient */
$gradient-top: linear-gradient(0deg, #240d12ff, #af1020ff, #5b5f62ff, #e2a51eff, #d9d89fff);
$gradient-right: linear-gradient(90deg, #240d12ff, #af1020ff, #5b5f62ff, #e2a51eff, #d9d89fff);
$gradient-bottom: linear-gradient(180deg, #240d12ff, #af1020ff, #5b5f62ff, #e2a51eff, #d9d89fff);
$gradient-left: linear-gradient(270deg, #240d12ff, #af1020ff, #5b5f62ff, #e2a51eff, #d9d89fff);
$gradient-top-right: linear-gradient(45deg, #240d12ff, #af1020ff, #5b5f62ff, #e2a51eff, #d9d89fff);
$gradient-bottom-right: linear-gradient(135deg, #240d12ff, #af1020ff, #5b5f62ff, #e2a51eff, #d9d89fff);
$gradient-top-left: linear-gradient(225deg, #240d12ff, #af1020ff, #5b5f62ff, #e2a51eff, #d9d89fff);
$gradient-bottom-left: linear-gradient(315deg, #240d12ff, #af1020ff, #5b5f62ff, #e2a51eff, #d9d89fff);
$gradient-radial: radial-gradient(#240d12ff, #af1020ff, #5b5f62ff, #e2a51eff, #d9d89fff);
```

|description|color name|
|-|-|
|Main color|`--coffee-bean`|
|Secondary color|`--charcoal`|
|Tertiary color|`--brick-red`|
|Font color|`--vanilla-custard`|
|Accent color|`--amber-honey`|

- Font: Machine Medium

## Images

- Local env image path: `aws/optimized-website/assets/images`
- Prod env image path: `To be defined, but it's planned to use an S3 bucket`

## Instructions

- Create the website given the specifications above (styles/images/topic)
- Performance Instructions
  - Store first request in cache memory
  - Requests after the first one should fetch images and all requests from cache memory (It's a must!)
  - Website must be really fast.
- Animation
  - Even if it's already mentioned above the weathers between raining and snow should be smooth
- Verify
  - For each transition between weathers check if the text or anything gets overlapped due to the colors, in that case wait for next instructions, but just for letting you know, it's planned to change colors dynamically in order to always make text or anything visible, but still needs to be defined if it can be used a tool for this color recognition or it can be used an mcp. (wait for the decision but still any suggestion is welcome).
  - Give the first request performance results.
  - Give the next requests performance results.
  - Compare between both performance results (Store results into another file).
- Gaps
  - Any gaps or assumptions you can ask them, we'll try to figure it out.

**Website results are stored into `aws/optimized-website/src` folder**