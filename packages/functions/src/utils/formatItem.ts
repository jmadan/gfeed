import { AttributeValue } from "@aws-sdk/client-dynamodb";
import * as uuid from "uuid";
const he = require('he');

interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  updated?: string;
  'dc:creator': string;
  guid?: string;
  category?: string[];
  content?: string; 
  img?: string;
}

function getImage(item: any, publisher: string) {
  const getImageUrl = (url: string) => {
    const index = url.indexOf('?');
    return index > 0 ? url.slice(0, index) : url;
  };

  if (item['media:content'] && Array.isArray(item['media:content'])) {
    return item['media:content'][0]['@_url'];
  }
  if (item['media:content'] && !Array.isArray(item['media:content'])) {
    return item['media:content']['@_url'];
  }
  if (item['media:thumbnail']) {
    return item['media:thumbnail']['@_url'];
  }

  if (item.mediaThumbnail && publisher === "HACKERNOON") {
    return getImageUrl(item.mediaThumbnail.$.url.slice(23));
  }

  if (item.mediaThumbnail && publisher === "Financial Times") {
    return item.mediaThumbnail.$.url;
  }

  if (item.enclosure) {
    return getImageUrl(item.enclosure['@_url']);
  }

  if (item["content:encoded"] && item["content:encoded"].match(/(<img.*)src\s*=\s*"(.+?)"/g)) {
    const match = he.decode(item["content:encoded"]).match(/(<img.*)src\s*=\s*"(.+?)"/g)[0];
    return getImageUrl(match.slice(match.indexOf('src="')+5, match.length-1));
  }

  if (item.content && item.content["#text"].match(/(<img.*)src\s*=\s*'(.+?)'/g) && publisher === "Martin Fowler") {
    const match = he.decode(item.content["#text"]).match(/(<img.*)src\s*=\s*'(.+?)'/g)[0];
    return getImageUrl(match.slice(match.indexOf("https"),match.length-1));
  }

  if (item.content && item.content["#text"] && publisher === "Sam Newman") {
    const match = he.decode(item.content["#text"]).match(/(<img.*)src\s*=\s*"(.+?)"/g);
    if(match){
      const imgPath = match[0].slice(match[0].indexOf('src="')+5, match[0].length-1);
      return `https://samnewman.io${imgPath}`;
    }
    return '';
  }

  if (item.content && item.content["#text"].match(/(<img.*)src\s*=\s*'(.+?)'/g)) {
    const match = he.decode(item.content["#text"]).match(/(<img.*)src\s*=\s*'(.+?)'/g)[0];
    return getImageUrl(match.slice(match.indexOf('src="')+5, match.length-1));
  }

  if (item.content && item.content["#text"] && item.content["#text"].match(/(<img.*)src\s*=\s*"(.+?)"/g)) {
    const match = he.decode(item.content["#text"]).match(/(<img.*)src\s*=\s*"(.+?)"/g)[0];
    return getImageUrl(match.slice(match.indexOf('src="')+5, match.length-1));
  }

  if (item.description && item.description.match(/(<img.*)src\s*=\s*"(.+?)"/g) && publisher === "Alice GG") {
    const match = he.decode(item["description"]).match(/(<img.*)src\s*=\s*"(.+?)"/g);
    if(match){
      const imgPath = match[0].slice(match[0].indexOf('src="')+5, match[0].length-1);
      return `https://alicegg.tech${imgPath}`;
    }
    return '';
  }

  if (item.description && item.description.match(/(<img.*)src\s*=\s*"(.+?)"/g)) {
    const match = he.decode(item["description"]).match(/(<img.*)src\s*=\s*"(.+?)"/g)[0];
    return getImageUrl(match.slice(match.indexOf('src="')+5, match.length-1));
  }
}

function getPublishedDate(item: any, publisher: string) {
  if (item.pubDate) {
    const dt = new Date(item.pubDate).toISOString().split("T")[0];
    return dt.trim();
  }

  if (item["dc:date"]) {
    const dt = new Date(item["dc:date"].trim()).toISOString().split("T")[0];
    return dt.trim();
  }

  if (item["dc:created"]) {
    const dt = new Date(item["dc:created"]).toISOString().split("T")[0];
    return dt.trim();
  }
  if(item.published){
    const dt = new Date(item.published).toISOString().split("T")[0];
    return dt.trim();
  }
 
  return '';
}

function getAuthor(item: any, publisher: string) {
  
  switch(publisher) {
    case "Overreacted":
      return "Dan Abramov";
    case "Martin Fowler":
      return "Martin Fowler";
    case "Alice GG":
      return "Alice Girard Guittard";
    case "Sam Newman":
      return "Sam Newman";
    case "DAN NORTH":
      return "Dan North";
    case "Financial Times":
      return "Financial Times";
    case "THE WALL STREET JOURNAL":
      return "THE WALL STREET JOURNAL";
    case "Hacker News":
      return "Hacker News";
    case "TokyoDev":
      return "Paul McMahon"
    case "Mitchell Hashimoto":
      return "Mitchell Hashimoto";
    case "Bloomberg Politics":
      if(item["dc:creator"]) {
        return item["dc:creator"];
      } else {
        return "Bloomberg";
      }
    case "A List Apart":
      return item.author.a["#text"]
   default: {
    if(item["dc:creator"]) {
     return item["dc:creator"];
    }
    if(typeof item["author"] === "object") {
      return item["author"]["name"];
    }
    if(typeof item["author"] !== "string" && item["author"] !== undefined) {
      const author = item["author"][0]["a"].map((author: any) => {
        return author["_"];
      }).join(',');
      return author;
    }
    return item["author"] ? item["author"] : publisher;
   }
  }
}

function getCategories(item: any, publisher: string) {
  let keywords = null;
  switch(publisher) {
    case "CoinDesk": {
      keywords = Array.from(new Set(item.category.map((cat: any) => cat['#text']))).join(',');
      break;
    }
    case "Overreacted":
      keywords = "React, JavaScript, Web Development, software development, programming";
      break;
    case "Martin Fowler":
      keywords = "software development, programming";
      break;
    case "The New York Times":
    case "Forbes":
      if(item.category && item.category.length > 1){
        keywords = item.category.map((cat: any) => cat["#text"]).join(',');
      }
    case "The Guardian":
      return item.category.map((cat: Record<any, any>) => cat["#text"]).join(',');
    case "Bloomberg": {
      if(item.category){
        keywords = item.category["#text"];
      }
      break;
    }
    case "Damien Aicheh": {
      keywords = item.category.map((cat: any) => cat['@_term']).join(',');
      break;
    }
    case "The Wall Street Journal": {
      keywords = item['wsj:articletype'].trim();
      break;
    }
   default: {
    if(item.category && typeof item.category === "string"){
      keywords = item.category;
    }
    if(item.category && typeof item.category !== "string" && item.category.length > 1){
      keywords = item.category.map((cat: string) => cat).join(',');
    }
    if (item.categories && item.categories.length > 1 && typeof item.categories !== "string") {
      keywords = Array.from(new Set(item.categories.map((cat: string) => cat && cat.includes('/') ? cat.slice(cat.lastIndexOf('/')+1) : cat)
        .map((cat: string) => cat))).join(',');
    } else if (item.categories && typeof item.categories === "string") {
      keywords = item.categories;
    }
   }
  }

  return keywords;
}

function extractImageFromDescription(description: any): string {
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  const imgSrc = imgRegex.exec(description);
  return imgSrc ? imgSrc[1] : "";
}

function getItemGuid(item: any, publisher: string) {
  switch(publisher) {
    case "InfoQ": {
      return he.decode(item.guid.trim().slice(0, item.guid.indexOf('utm_')));
    }
    case "Mitchell Hashimoto":
    case "The Guardian":
    case "DAN NORTH":
    case "A List Apart":
    case "Overreacted":
      return he.decode(item.guid.trim());
    default:
      return item.guid ? he.decode(item.guid['#text'].trim()): he.decode(item.id.trim());
  }
}

function getItemLink(item: any, publisher: string) {
  if(typeof item.link === "object"){
    return he.decode(item.link['@_href'].trim().slice(0, item.link['@_href'].indexOf('utm')));
  }
  if(item.link.includes('utm_source')){
    return he.decode(item.link.trim().slice(0, item.link.indexOf('utm')));
  } else {
    return he.decode(item.link.trim());
  }
}

function getItemDescription(item: any, publisher: string) {
  if(item.content){
    return he.decode(item.content['#text'].trim());
  }
  if(item.description){
    return he.decode(item.description.trim());
  }
  return '';
}

function getItemTitle(item: any, publisher: string): string {
  if(typeof item.title === 'object'){
    return he.decode(item.title['#text'].trim());
  }
  return he.decode(item.title.trim());
}

export const formatItem = (item: any, publisher: string, tag: string): Record<any, AttributeValue> => {
  let img = "";
  let pubDate: string|number;

  try {
    const publishedDate = getPublishedDate(item, publisher) as string;
  
    pubDate = publishedDate ? new Date(publishedDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
    img = getImage(item, publisher) ?? '';
  
    switch(publisher) {
      case "A List Apart":
        if(!img){
          img = extractImageFromDescription(item.description);
        }
        break;
      case "HACKERNOON":
        img = img?.replace("https://hackernoon.com/", "");
        break;
     default:
        break;
    }

    const feedItem: Record<string, AttributeValue> = {
      id: { S: uuid.v4() },
      publishedDate: { S: getPublishedDate(item, publisher) },
      title: { S: getItemTitle(item, publisher) },
      link: { S: getItemLink(item, publisher) },
      pubDate: { N: new Date(pubDate).getTime().toString() },
      author: { S: getAuthor(item, publisher) },
      guid: { S: getItemGuid(item, publisher) },
      keywords: { S: getCategories(item, publisher) ?? tag },
      tag: { S: tag },
      publisher: { S: publisher },
      content: { S: getItemDescription(item, publisher) },
      img: { S: img ?? "" },
    };

    return feedItem;
  
  }
  catch (error) {
    console.log('formatItem item', item.title, publisher);
    console.log('formatItem error', error);
  }
  return {};  
};