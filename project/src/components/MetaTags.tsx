import { useEffect } from 'react';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  imageAlt?: string;
}

export function MetaTags({ title, description, image, url, imageAlt }: MetaTagsProps) {
  useEffect(() => {
    const defaultTitle = 'Pocket Cashier';
    const defaultDescription = 'Business Suite';

    const metaTitle = title || defaultTitle;
    const metaDescription = description || defaultDescription;
    const metaUrl = url || window.location.href;

    document.title = metaTitle;

    updateMetaTag('description', metaDescription);

    updateMetaTag('og:title', metaTitle, 'property');
    updateMetaTag('og:description', metaDescription, 'property');
    updateMetaTag('og:url', metaUrl, 'property');
    updateMetaTag('og:type', 'website', 'property');
    updateMetaTag('og:site_name', title || defaultTitle, 'property');
    updateMetaTag('og:locale', 'en_US', 'property');

    if (image) {
      updateMetaTag('og:image', image, 'property');
      updateMetaTag('og:image:url', image, 'property');
      updateMetaTag('og:image:secure_url', image, 'property');
      updateMetaTag('og:image:type', 'image/png', 'property');
      updateMetaTag('og:image:width', '1200', 'property');
      updateMetaTag('og:image:height', '630', 'property');
      if (imageAlt) {
        updateMetaTag('og:image:alt', imageAlt, 'property');
      }
    }

    updateMetaTag('twitter:card', image ? 'summary_large_image' : 'summary');
    updateMetaTag('twitter:site', title || defaultTitle);
    updateMetaTag('twitter:title', metaTitle);
    updateMetaTag('twitter:description', metaDescription);
    if (image) {
      updateMetaTag('twitter:image', image);
      updateMetaTag('twitter:image:src', image);
      if (imageAlt) {
        updateMetaTag('twitter:image:alt', imageAlt);
      }
    }

    if (image) {
      updateMetaTag('name', metaTitle, 'itemprop');
      updateMetaTag('description', metaDescription, 'itemprop');
      updateMetaTag('image', image, 'itemprop');
    }

    updateMetaTag('apple-mobile-web-app-title', metaTitle);
    updateMetaTag('apple-mobile-web-app-capable', 'yes');

    if (url) {
      updateCanonicalLink(url);
    }
  }, [title, description, image, url, imageAlt]);

  return null;
}

function updateMetaTag(name: string, content: string, attribute: string = 'name') {
  if (!content) return;

  let element = document.querySelector(`meta[${attribute}="${name}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function updateCanonicalLink(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }

  link.href = url;
}
