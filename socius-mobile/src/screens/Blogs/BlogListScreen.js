import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/common/Header';
import MotionView from '../../components/common/MotionView';
import { useResponsive } from '../../utils/responsive';
import { getBlogsByType } from '../../services/api/blog.api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BlogListScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { blogType } = route?.params || {};
  
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pagination, setPagination] = useState(null);

  const fetchBlogs = useCallback(async (pageNum = 1, isRefresh = false) => {
    if (!blogType?._id && !blogType?.id) return;
    
    try {
      const typeId = blogType._id || blogType.id;
      const response = await getBlogsByType(typeId, pageNum, 10);
      
      if (isRefresh || pageNum === 1) {
        setBlogs(response.items || []);
      } else {
        setBlogs(prev => [...prev, ...(response.items || [])]);
      }
      
      setPagination(response.pagination);
      setHasMore(response.pagination?.hasMore || false);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [blogType]);

  useEffect(() => {
    fetchBlogs(1, true);
  }, [fetchBlogs]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchBlogs(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchBlogs(nextPage);
    }
  };

  const handleBlogPress = (blog) => {
    navigation.navigate('BlogDetail', { blog, blogType });
  };

  const getFullImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const baseUrl = 'http://192.168.1.74:48080';
    return `${baseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  const renderBlogCard = ({ item: blog, index }) => {
    const imageUrl = getFullImageUrl(blog.featuredImage);
    const delay = (index % 10) * 50;

    return (
      <MotionView preset="fadeUp" duration={220} delay={delay}>
        <TouchableOpacity
          onPress={() => handleBlogPress(blog)}
          style={[styles.blogCard, { borderRadius: scale(16), marginBottom: vscale(16) }]}
          activeOpacity={0.9}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={[styles.blogImage, { height: vscale(160), borderTopLeftRadius: scale(16), borderTopRightRadius: scale(16) }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.blogImagePlaceholder, { height: vscale(160), borderTopLeftRadius: scale(16), borderTopRightRadius: scale(16) }]}>
              <Icon name="file-document-outline" size={scale(48)} color="#CCC" />
            </View>
          )}
          
          <View style={[styles.blogContent, { padding: spacing(16) }]}>
            <Text style={[styles.blogTitle, { fontSize: ms(16), marginBottom: vscale(8) }]} numberOfLines={2}>
              {blog.title}
            </Text>
            
            {blog.excerpt && (
              <Text style={[styles.blogExcerpt, { fontSize: ms(13), lineHeight: ms(18), marginBottom: vscale(12) }]} numberOfLines={3}>
                {blog.excerpt}
              </Text>
            )}
            
            <View style={styles.blogMeta}>
              <View style={styles.metaItem}>
                <Icon name="eye-outline" size={scale(14)} color="#999" />
                <Text style={[styles.metaText, { fontSize: ms(12), marginLeft: spacing(4) }]}>
                  {blog.views || 0}
                </Text>
              </View>
              
              {blog.author && (
                <View style={styles.metaItem}>
                  <Icon name="account-outline" size={scale(14)} color="#999" />
                  <Text style={[styles.metaText, { fontSize: ms(12), marginLeft: spacing(4) }]}>
                    {blog.author}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </MotionView>
    );
  };

  const renderEmptyState = () => (
    <View style={[styles.emptyState, { paddingVertical: vscale(60) }]}>
      <View style={[styles.emptyIcon, { width: scale(80), height: scale(80), borderRadius: scale(40), marginBottom: vscale(16) }]}>
        <Icon name="file-document-outline" size={scale(40)} color="#CCC" />
      </View>
      <Text style={[styles.emptyTitle, { fontSize: ms(16), marginBottom: vscale(8) }]}>
        No articles yet
      </Text>
      <Text style={[styles.emptyText, { fontSize: ms(14) }]}>
        Check back later for {blogType?.name} content
      </Text>
    </View>
  );

  if (loading && !refreshing && blogs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title={blogType?.name || 'Articles'}
          onBackPress={() => navigation.goBack()}
          showBackButton
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C84D59" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={blogType?.name || 'Articles'}
        onBackPress={() => navigation.goBack()}
        showBackButton
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />

      {/* Blog Type Header */}
      <View style={[styles.typeHeader, { paddingHorizontal: spacing(20), paddingVertical: vscale(16) }]}>
        <View style={styles.typeInfo}>
          {blogType?.iconUrl ? (
            <Image
              source={{ uri: getFullImageUrl(blogType.iconUrl) }}
              style={[styles.typeIcon, { width: scale(48), height: scale(48), borderRadius: scale(12) }]}
            />
          ) : (
            <View style={[styles.typeIconPlaceholder, { width: scale(48), height: scale(48), borderRadius: scale(12), backgroundColor: blogType?.color || '#C84D59' }]}>
              <Icon name="file-document" size={scale(24)} color="#FFF" />
            </View>
          )}
          <View style={[styles.typeTextContainer, { marginLeft: spacing(12) }]}>
            <Text style={[styles.typeName, { fontSize: ms(18) }]}>{blogType?.name}</Text>
            <Text style={[styles.typeCount, { fontSize: ms(13) }]}>
              {pagination?.total || blogs.length} {blogs.length === 1 ? 'article' : 'articles'}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={blogs}
        renderItem={renderBlogCard}
        keyExtractor={(item) => item._id || item.id}
        contentContainerStyle={[styles.listContainer, { paddingHorizontal: spacing(20), paddingBottom: vscale(24) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#C84D59"
            colors={['#C84D59']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={() => 
          loading && blogs.length > 0 ? (
            <View style={{ paddingVertical: vscale(16) }}>
              <ActivityIndicator size="small" color="#C84D59" />
            </View>
          ) : null
        }
      />
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
  typeHeader: {
    backgroundColor: '#FAFBFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    backgroundColor: '#F0F0F0',
  },
  typeIconPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeTextContainer: {
    flex: 1,
  },
  typeName: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  typeCount: {
    color: '#666',
    marginTop: 2,
  },
  listContainer: {
    paddingTop: 16,
  },
  blogCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  blogImage: {
    width: '100%',
    backgroundColor: '#F5F5F5',
  },
  blogImagePlaceholder: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blogContent: {},
  blogTitle: {
    fontWeight: '600',
    color: '#2C3E50',
    lineHeight: 22,
  },
  blogExcerpt: {
    color: '#666',
  },
  blogMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default BlogListScreen;
