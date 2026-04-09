import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import RenderHtml from 'react-native-render-html';
import Header from '../../components/common/Header';
import MotionView from '../../components/common/MotionView';
import { useResponsive } from '../../utils/responsive';
import { getBlogBySlug, getPublicMediaUrl } from '../../services/api/blog.api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BlogDetailScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { blog: initialBlog, blogType } = route?.params || {};
  
  const [blog, setBlog] = useState(initialBlog || null);
  const needsRemoteBody = !!(initialBlog?.slug && !initialBlog?.content);
  const [loading, setLoading] = useState(!initialBlog || needsRemoteBody);
  const [error, setError] = useState(null);

  useEffect(() => {
    const slug = initialBlog?.slug;
    if (!slug) {
      setLoading(false);
      if (!initialBlog) setError('Article not found');
      return undefined;
    }
    if (initialBlog.content) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getBlogBySlug(slug);
        if (cancelled) return;
        if (data) {
          setBlog(data);
          setError(null);
        } else {
          setError('Failed to load article');
        }
      } catch {
        if (!cancelled) setError('Failed to load article');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialBlog?.slug, initialBlog?.content]);

  const fetchBlogDetails = async () => {
    const slug = blog?.slug || initialBlog?.slug;
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);
      const response = await getBlogBySlug(slug);
      if (response) {
        setBlog(response);
      } else {
        setError('Failed to load article');
      }
    } catch (err) {
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${blog.title}\n\n${blog.excerpt || ''}`,
        title: blog.title,
      });
    } catch (err) {
      // Share cancelled or failed
    }
  };

  const htmlStyles = {
    body: {
      fontSize: ms(15),
      lineHeight: ms(24),
      color: '#333',
      fontFamily: 'System',
    },
    p: {
      marginBottom: vscale(16),
    },
    h1: {
      fontSize: ms(24),
      fontWeight: '700',
      color: '#2C3E50',
      marginBottom: vscale(16),
      marginTop: vscale(16),
    },
    h2: {
      fontSize: ms(20),
      fontWeight: '600',
      color: '#2C3E50',
      marginBottom: vscale(12),
      marginTop: vscale(16),
    },
    h3: {
      fontSize: ms(18),
      fontWeight: '600',
      color: '#2C3E50',
      marginBottom: vscale(10),
      marginTop: vscale(14),
    },
    ul: {
      marginLeft: spacing(20),
      marginBottom: vscale(16),
    },
    ol: {
      marginLeft: spacing(20),
      marginBottom: vscale(16),
    },
    li: {
      marginBottom: vscale(8),
    },
    strong: {
      fontWeight: '700',
      color: '#2C3E50',
    },
    em: {
      fontStyle: 'italic',
    },
    a: {
      color: '#C84D59',
      textDecorationLine: 'underline',
    },
    img: {
      width: '100%',
      height: vscale(200),
      borderRadius: scale(12),
      marginVertical: vscale(16),
    },
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Article"
          onBackPress={() => navigation.goBack()}
          showBackButton
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C84D59" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !blog) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Article"
          onBackPress={() => navigation.goBack()}
          showBackButton
        />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={scale(64)} color="#CCC" />
          <Text style={[styles.errorText, { fontSize: ms(16), marginTop: vscale(16) }]}>
            {error || 'Article not found'}
          </Text>
          <TouchableOpacity
            onPress={fetchBlogDetails}
            style={[styles.retryButton, { marginTop: vscale(24), paddingHorizontal: spacing(24), paddingVertical: vscale(12), borderRadius: scale(8) }]}
          >
            <Text style={[styles.retryButtonText, { fontSize: ms(14) }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = getPublicMediaUrl(blog.featuredImageUrl || blog.featuredImage);
  const displayContent = blog.content || `<p>${blog.excerpt || ''}</p>`;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={blogType?.name || 'Article'}
        onBackPress={() => navigation.goBack()}
        showBackButton
        rightComponent={
          <TouchableOpacity onPress={handleShare} style={{ padding: scale(8) }}>
            <Icon name="share-variant" size={scale(22)} color="#666" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: vscale(40) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Image */}
        {imageUrl && (
          <MotionView preset="fadeIn" duration={300}>
            <Image
              source={{ uri: imageUrl }}
              style={[styles.featuredImage, { height: vscale(220), width: SCREEN_WIDTH }]}
              resizeMode="cover"
            />
          </MotionView>
        )}

        {/* Content Container */}
        <View style={[styles.contentContainer, { paddingHorizontal: spacing(20), paddingTop: vscale(24) }]}>
          {/* Title */}
          <MotionView preset="fadeUp" duration={220} delay={100}>
            <Text style={[styles.title, { fontSize: ms(24), lineHeight: ms(32), marginBottom: vscale(16) }]}>
              {blog.title}
            </Text>
          </MotionView>

          {/* Meta Info */}
          <MotionView preset="fadeUp" duration={220} delay={150}>
            <View style={[styles.metaContainer, { marginBottom: vscale(24), paddingBottom: vscale(16), borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }]}>
              <View style={styles.metaRow}>
                {blog.author && (
                  <View style={styles.metaItem}>
                    <Icon name="account" size={scale(14)} color="#999" />
                    <Text style={[styles.metaText, { fontSize: ms(12), marginLeft: spacing(6) }]}>
                      {blog.author}
                    </Text>
                  </View>
                )}
                
                <View style={styles.metaItem}>
                  <Icon name="eye" size={scale(14)} color="#999" />
                  <Text style={[styles.metaText, { fontSize: ms(12), marginLeft: spacing(6) }]}>
                    {blog.views || 0} views
                  </Text>
                </View>

                {blog.publishedAt && (
                  <View style={styles.metaItem}>
                    <Icon name="calendar" size={scale(14)} color="#999" />
                    <Text style={[styles.metaText, { fontSize: ms(12), marginLeft: spacing(6) }]}>
                      {new Date(blog.publishedAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </MotionView>

          {/* Article Content */}
          <MotionView preset="fadeUp" duration={220} delay={200}>
            <RenderHtml
              contentWidth={contentWidth}
              source={{ html: displayContent }}
              tagsStyles={htmlStyles}
              defaultTextProps={{
                style: { fontSize: ms(15), lineHeight: ms(24), color: '#333' }
              }}
            />
          </MotionView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#C84D59',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  featuredImage: {
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  metaContainer: {},
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 4,
  },
  metaText: {
    color: '#999',
  },
});

export default BlogDetailScreen;
