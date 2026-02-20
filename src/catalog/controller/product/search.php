<?php
class ControllerProductSearch extends Controller {
	public function index() {
		$this->load->language('product/search');
		$this->load->model('catalog/category');
		$this->load->model('catalog/product');
		$this->load->model('tool/image');

		$search = isset($this->request->get['search']) ? $this->request->get['search'] : '';
		$tag = isset($this->request->get['tag']) ? $this->request->get['tag'] : $search;
		$sort = isset($this->request->get['sort']) ? $this->request->get['sort'] : 'p.sort_order';
		$order = isset($this->request->get['order']) ? $this->request->get['order'] : 'ASC';
		$page = isset($this->request->get['page']) ? (int)$this->request->get['page'] : 1;
		$limit = (isset($this->request->get['limit']) && (int)$this->request->get['limit'] > 0)
			? (int)$this->request->get['limit']
			: $this->config->get('theme_' . $this->config->get('config_theme') . '_product_limit');

		if ($search) {
			$this->document->setTitle($this->language->get('heading_title') . ' - ' . $search);
		} else {
			$this->document->setTitle($this->language->get('heading_title'));
		}

		$this->document->addStyle('catalog/view/theme/dreamer/stylesheet/category.css', 'stylesheet', 'screen', 'footer');

		// Breadcrumbs
		$data['breadcrumbs'] = array();
		$data['breadcrumbs'][] = array(
			'text' => $this->language->get('text_home'),
			'href' => $this->url->link('common/home')
		);
		$data['breadcrumbs'][] = array(
			'text' => $this->language->get('heading_title'),
			'href' => $this->url->link('product/search', '&search=' . urlencode($search))
		);

		$data['products'] = array();
		$data['related_categories'] = array();

		if ($search || $tag) {
			$filter_data = array(
				'filter_name'     => $search,
				'filter_tag'      => $tag,
				'filter_fulltext' => true,
				'sort'            => $sort,
				'order'           => $order,
				'start'           => ($page - 1) * $limit,
				'limit'           => $limit
			);

			$product_total = $this->model_catalog_product->getTotalProducts($filter_data);
			$results = $this->model_catalog_product->getProducts($filter_data);

			// Collect related categories from search results
			$category_counts = array();
			foreach ($results as $result) {
				$product_cats = $this->model_catalog_product->getCategories($result['product_id']);
				foreach ($product_cats as $pc) {
					$cid = $pc['category_id'];
					$category_counts[$cid] = isset($category_counts[$cid]) ? $category_counts[$cid] + 1 : 1;
				}
			}
			arsort($category_counts);
			$top_cat_ids = array_slice(array_keys($category_counts), 0, 10);

			foreach ($top_cat_ids as $cid) {
				$cat_info = $this->model_catalog_category->getCategory($cid);
				if ($cat_info) {
					$data['related_categories'][] = array(
						'name' => $cat_info['name'],
						'href' => $this->url->link('product/category', 'path=' . $cid)
					);
				}
			}

			// Build product data
			foreach ($results as $result) {
				if ($result['image']) {
					$image = $this->model_tool_image->resize($result['image'], $this->config->get('theme_' . $this->config->get('config_theme') . '_image_product_width'), $this->config->get('theme_' . $this->config->get('config_theme') . '_image_product_height'));
				} else {
					$image = $this->model_tool_image->resize('placeholder.png', $this->config->get('theme_' . $this->config->get('config_theme') . '_image_product_width'), $this->config->get('theme_' . $this->config->get('config_theme') . '_image_product_height'));
				}

				if ($this->customer->isLogged() || !$this->config->get('config_customer_price')) {
					$price = $this->currency->format($this->tax->calculate($result['price'], $result['tax_class_id'], $this->config->get('config_tax')), $this->session->data['currency']);
				} else {
					$price = false;
				}

				$special = false;
				$save_amount = false;
				if (!is_null($result['special']) && (float)$result['special'] >= 0) {
					$special = $this->currency->format($this->tax->calculate($result['special'], $result['tax_class_id'], $this->config->get('config_tax')), $this->session->data['currency']);
					$diff = (float)$result['price'] - (float)$result['special'];
					if ($diff > 0) {
						$save_amount = $this->currency->format($this->tax->calculate($diff, $result['tax_class_id'], $this->config->get('config_tax')), $this->session->data['currency']);
					}
				}

				$in_stock = (int)$result['quantity'] > 0;

				$data['products'][] = array(
					'product_id'   => $result['product_id'],
					'thumb'        => $image,
					'name'         => $result['name'],
					'description'  => utf8_substr(trim(strip_tags(html_entity_decode($result['description'], ENT_QUOTES, 'UTF-8'))), 0, $this->config->get('theme_' . $this->config->get('config_theme') . '_product_description_length')) . '..',
					'price'        => $price,
					'special'      => $special,
					'save_amount'  => $save_amount,
					'in_stock'     => $in_stock,
					'stock_status' => $result['stock_status'],
					'minimum'      => $result['minimum'] > 0 ? $result['minimum'] : 1,
					'rating'       => $result['rating'],
					'href'         => $this->url->link('product/product', 'product_id=' . $result['product_id'])
				);
			}

			// Sort options
			$url = '&search=' . urlencode($search);
			if (isset($this->request->get['limit'])) {
				$url .= '&limit=' . $this->request->get['limit'];
			}

			$data['sorts'] = array();
			$data['sorts'][] = array(
				'text'  => $this->language->get('text_default'),
				'value' => 'p.sort_order-ASC',
				'href'  => $this->url->link('product/search', 'sort=p.sort_order&order=ASC' . $url)
			);
			$data['sorts'][] = array(
				'text'  => $this->language->get('text_name_asc'),
				'value' => 'pd.name-ASC',
				'href'  => $this->url->link('product/search', 'sort=pd.name&order=ASC' . $url)
			);
			$data['sorts'][] = array(
				'text'  => $this->language->get('text_name_desc'),
				'value' => 'pd.name-DESC',
				'href'  => $this->url->link('product/search', 'sort=pd.name&order=DESC' . $url)
			);
			$data['sorts'][] = array(
				'text'  => $this->language->get('text_price_asc'),
				'value' => 'p.price-ASC',
				'href'  => $this->url->link('product/search', 'sort=p.price&order=ASC' . $url)
			);
			$data['sorts'][] = array(
				'text'  => $this->language->get('text_price_desc'),
				'value' => 'p.price-DESC',
				'href'  => $this->url->link('product/search', 'sort=p.price&order=DESC' . $url)
			);

			// Limit options
			$url = '&search=' . urlencode($search);
			if (isset($this->request->get['sort'])) {
				$url .= '&sort=' . $this->request->get['sort'];
			}
			if (isset($this->request->get['order'])) {
				$url .= '&order=' . $this->request->get['order'];
			}

			$data['limits'] = array();
			$limits = array_unique(array($this->config->get('theme_' . $this->config->get('config_theme') . '_product_limit'), 25, 50, 75, 100));
			sort($limits);

			foreach ($limits as $value) {
				$data['limits'][] = array(
					'text'  => $value,
					'value' => $value,
					'href'  => $this->url->link('product/search', $url . '&limit=' . $value)
				);
			}

			// Pagination
			$url = '&search=' . urlencode($search);
			if (isset($this->request->get['sort'])) {
				$url .= '&sort=' . $this->request->get['sort'];
			}
			if (isset($this->request->get['order'])) {
				$url .= '&order=' . $this->request->get['order'];
			}
			if (isset($this->request->get['limit'])) {
				$url .= '&limit=' . $this->request->get['limit'];
			}

			$pagination = new Pagination();
			$pagination->total = $product_total;
			$pagination->page = $page;
			$pagination->limit = $limit;
			$pagination->url = $this->url->link('product/search', $url . '&page={page}');

			$data['pagination'] = $pagination->render();
			$data['results'] = sprintf($this->language->get('text_pagination'), ($product_total) ? (($page - 1) * $limit) + 1 : 0, ((($page - 1) * $limit) > ($product_total - $limit)) ? $product_total : ((($page - 1) * $limit) + $limit), $product_total, ceil($product_total / $limit));

			// Log search
			if ($search && $this->config->get('config_customer_search')) {
				$this->load->model('account/search');

				$this->model_account_search->addSearch(array(
					'keyword'      => $search,
					'category_id'  => 0,
					'sub_category' => '',
					'description'  => '',
					'products'     => $product_total,
					'customer_id'  => $this->customer->isLogged() ? $this->customer->getId() : 0,
					'ip'           => isset($this->request->server['REMOTE_ADDR']) ? $this->request->server['REMOTE_ADDR'] : ''
				));
			}
		}

		$data['search'] = $search;
		$data['sort'] = $sort;
		$data['order'] = $order;
		$data['limit'] = $limit;

		$data['continue'] = $this->url->link('common/home');

		$data['footer'] = $this->load->controller('common/footer');
		$data['header'] = $this->load->controller('common/header');

		$this->response->setOutput($this->load->view('product/search', $data));
	}

	public function autocomplete() {
		$json = array('products' => array(), 'categories' => array());

		if (isset($this->request->get['filter_name']) && strlen(trim($this->request->get['filter_name'])) >= 2) {
			$query = trim($this->request->get['filter_name']);

			// Products (max 6)
			$this->load->model('catalog/product');
			$this->load->model('tool/image');

			$results = $this->model_catalog_product->getProducts(array(
				'filter_name'     => $query,
				'filter_tag'      => $query,
				'filter_fulltext' => true,
				'start'           => 0,
				'limit'           => 6,
			));

			foreach ($results as $p) {
				$image = $p['image'] ?: 'no_image.png';
				$thumb = $this->model_tool_image->resize($image, 60, 60);

				$price = $this->currency->format(
					$this->tax->calculate($p['price'], $p['tax_class_id'], $this->config->get('config_tax')),
					$this->session->data['currency']
				);
				$special = '';
				if (!is_null($p['special']) && (float)$p['special'] >= 0) {
					$special = $this->currency->format(
						$this->tax->calculate($p['special'], $p['tax_class_id'], $this->config->get('config_tax')),
						$this->session->data['currency']
					);
				}

				$json['products'][] = array(
					'product_id'   => (int)$p['product_id'],
					'name'         => html_entity_decode($p['name'], ENT_QUOTES, 'UTF-8'),
					'href'         => $this->url->link('product/product', 'product_id=' . $p['product_id']),
					'thumb'        => $thumb,
					'price'        => $price,
					'special'      => $special,
					'in_stock'     => (int)$p['quantity'] > 0,
					'stock_status' => $p['stock_status'],
				);
			}

			// Categories (max 5)
			$this->load->model('catalog/category');
			$categories = $this->model_catalog_category->searchCategories($query, 5);
			foreach ($categories as $cat) {
				$path_name = $cat['parent_name'] ? $cat['parent_name'] . ' > ' . $cat['name'] : $cat['name'];
				$json['categories'][] = array(
					'category_id' => (int)$cat['category_id'],
					'name'        => $path_name,
					'href'        => $this->url->link('product/category', 'path=' . $cat['category_id']),
				);
			}
		}

		$this->response->addHeader('Content-Type: application/json');
		$this->response->setOutput(json_encode($json));
	}
}
