import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { getStaticPageBySlug } from '../../services/api/staticPage.api';
import { useResponsive } from '../../utils/responsive';

const StaticPageViewer = ({ slug, fallbackContent }) => {
  const { width } = useWindowDimensions();
  const { ms, spacing } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchPage();
  }, [slug]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await getStaticPageBySlug(slug);
      
      if (response?.success && response?.data) {
        setContent(response.data.content);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC5C69" />
      </View>
    );
  }

  if (error && !fallbackContent) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.errorText, { fontSize: ms(16) }]}>
          Failed to load content. Please try again later.
        </Text>
      </View>
    );
  }

  const htmlContent = content || fallbackContent;
  
  // Wrap content in basic HTML structure with styles
  const styledHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          body {
            font-family: -apple-system, Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #333;
            padding: 20px;
            margin: 0;
            background-color: #ffffff;
          }
          h1, h2, h3 { color: #DC5C69; margin-top: 24px; margin-bottom: 12px; }
          h1 { font-size: 24px; }
          h2 { font-size: 20px; }
          h3 { font-size: 18px; }
          p { margin-bottom: 16px; }
          ul, ol { margin-bottom: 16px; padding-left: 24px; }
          li { margin-bottom: 8px; }
          strong { color: #000; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: styledHtml }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default StaticPageViewer;
