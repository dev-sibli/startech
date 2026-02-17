<?php
class ControllerCheckoutCheckout extends Controller {
	public function index() {
		// Validate cart has products and has stock.
		if ((!$this->cart->hasProducts() && empty($this->session->data['vouchers'])) || (!$this->cart->hasStock() && !$this->config->get('config_stock_checkout'))) {
			$this->response->redirect($this->url->link('checkout/cart'));
		}

		// Validate minimum quantity requirements.
		$products = $this->cart->getProducts();

		foreach ($products as $product) {
			$product_total = 0;

			foreach ($products as $product_2) {
				if ($product_2['product_id'] == $product['product_id']) {
					$product_total += $product_2['quantity'];
				}
			}

			if ($product['minimum'] > $product_total) {
				$this->response->redirect($this->url->link('checkout/cart'));
			}
		}

		$this->load->language('checkout/checkout');

		$this->document->setTitle($this->language->get('heading_title'));

		$this->document->addStyle('catalog/view/theme/dreamer/stylesheet/checkout.css');
		$this->document->addScript('catalog/view/theme/dreamer/javascript/checkout.js', 'footer');

		$data['breadcrumbs'] = array();

		$data['breadcrumbs'][] = array(
			'text' => $this->language->get('text_home'),
			'href' => $this->url->link('common/home')
		);

		$data['breadcrumbs'][] = array(
			'text' => $this->language->get('text_cart'),
			'href' => $this->url->link('checkout/cart')
		);

		$data['breadcrumbs'][] = array(
			'text' => $this->language->get('heading_title'),
			'href' => $this->url->link('checkout/checkout', '', true)
		);

		if (isset($this->session->data['error'])) {
			$data['error_warning'] = $this->session->data['error'];
			unset($this->session->data['error']);
		} else {
			$data['error_warning'] = '';
		}

		$data['logged'] = $this->customer->isLogged();
		$data['shipping_required'] = $this->cart->hasShipping();

		// Customer data (pre-fill for logged-in users)
		if ($this->customer->isLogged()) {
			$this->load->model('account/customer');
			$customer_info = $this->model_account_customer->getCustomer($this->customer->getId());

			$data['firstname'] = $customer_info['firstname'];
			$data['lastname'] = $customer_info['lastname'];
			$data['email'] = $customer_info['email'];
			$data['telephone'] = $customer_info['telephone'];

			$this->load->model('account/address');
			$address = $this->model_account_address->getAddress($this->customer->getAddressId());

			if ($address) {
				$data['address_1'] = $address['address_1'];
				$data['city'] = $address['city'];
				$data['zone_id'] = $address['zone_id'];
			} else {
				$data['address_1'] = '';
				$data['city'] = '';
				$data['zone_id'] = '';
			}
		} elseif (isset($this->session->data['guest'])) {
			$data['firstname'] = $this->session->data['guest']['firstname'];
			$data['lastname'] = $this->session->data['guest']['lastname'];
			$data['email'] = $this->session->data['guest']['email'];
			$data['telephone'] = $this->session->data['guest']['telephone'];
			$data['address_1'] = isset($this->session->data['payment_address']['address_1']) ? $this->session->data['payment_address']['address_1'] : '';
			$data['city'] = isset($this->session->data['payment_address']['city']) ? $this->session->data['payment_address']['city'] : '';
			$data['zone_id'] = isset($this->session->data['payment_address']['zone_id']) ? $this->session->data['payment_address']['zone_id'] : '';
		} else {
			$data['firstname'] = '';
			$data['lastname'] = '';
			$data['email'] = '';
			$data['telephone'] = '';
			$data['address_1'] = '';
			$data['city'] = '';
			$data['zone_id'] = '';
		}

		$data['country_id'] = $this->config->get('config_country_id');

		// Zones for District dropdown
		$this->load->model('localisation/zone');
		$data['zones'] = $this->model_localisation_zone->getZonesByCountryId($data['country_id']);

		// Cart products
		$data['products'] = array();

		foreach ($this->cart->getProducts() as $product) {
			$option_data = array();

			foreach ($product['option'] as $option) {
				$option_data[] = array(
					'name'  => $option['name'],
					'value' => $option['value']
				);
			}

			$data['products'][] = array(
				'cart_id'    => $product['cart_id'],
				'product_id' => $product['product_id'],
				'name'       => $product['name'],
				'model'      => $product['model'],
				'option'     => $option_data,
				'quantity'   => $product['quantity'],
				'price'      => $this->currency->format($this->tax->calculate($product['price'], $product['tax_class_id'], $this->config->get('config_tax')), $this->session->data['currency']),
				'total'      => $this->currency->format($this->tax->calculate($product['price'], $product['tax_class_id'], $this->config->get('config_tax')) * $product['quantity'], $this->session->data['currency']),
				'href'       => $this->url->link('product/product', 'product_id=' . $product['product_id'])
			);
		}

		// Vouchers in cart
		$data['vouchers'] = array();

		if (!empty($this->session->data['vouchers'])) {
			foreach ($this->session->data['vouchers'] as $voucher) {
				$data['vouchers'][] = array(
					'description' => $voucher['description'],
					'amount'      => $this->currency->format($voucher['amount'], $this->session->data['currency'])
				);
			}
		}

		$this->load->model('setting/extension');

		// Shipping methods — load BEFORE totals so shipping cost is included
		$data['shipping_methods'] = array();

		if ($this->cart->hasShipping()) {
			$temp_address = array(
				'address_id'     => 0,
				'firstname'      => '',
				'lastname'       => '',
				'company'        => '',
				'address_1'      => '',
				'address_2'      => '',
				'postcode'       => '',
				'city'           => '',
				'zone_id'        => $this->config->get('config_zone_id'),
				'zone'           => '',
				'zone_code'      => '',
				'country_id'     => $this->config->get('config_country_id'),
				'country'        => '',
				'iso_code_2'     => '',
				'iso_code_3'     => '',
				'address_format' => ''
			);

			// Also set temp address in session so the shipping total extension can find it
			if (!isset($this->session->data['shipping_address'])) {
				$this->session->data['shipping_address'] = $temp_address;
			}

			$results = $this->model_setting_extension->getExtensions('shipping');

			foreach ($results as $result) {
				if ($this->config->get('shipping_' . $result['code'] . '_status')) {
					$this->load->model('extension/shipping/' . $result['code']);

					$quote = $this->{'model_extension_shipping_' . $result['code']}->getQuote($temp_address);

					if ($quote) {
						$data['shipping_methods'][$result['code']] = array(
							'title'      => $quote['title'],
							'quote'      => $quote['quote'],
							'sort_order' => $quote['sort_order'],
							'error'      => $quote['error']
						);
					}
				}
			}

			$sort_order = array();
			foreach ($data['shipping_methods'] as $key => $value) {
				$sort_order[$key] = $value['sort_order'];
			}
			if ($sort_order) {
				array_multisort($sort_order, SORT_ASC, $data['shipping_methods']);
			}

			// Store shipping_methods in session so shipping_method/save can validate
			$this->session->data['shipping_methods'] = $data['shipping_methods'];

			// Auto-select first shipping method and set in session for totals calculation
			if ($data['shipping_methods'] && !isset($this->session->data['shipping_method'])) {
				$first_method = reset($data['shipping_methods']);
				if ($first_method && !empty($first_method['quote'])) {
					$first_quote = reset($first_method['quote']);
					$this->session->data['shipping_method'] = $first_quote;
				}
			}
		}

		// Totals (calculated after shipping method is set so shipping cost is included)
		$totals = array();
		$taxes = $this->cart->getTaxes();
		$total = 0;

		$total_data = array(
			'totals' => &$totals,
			'taxes'  => &$taxes,
			'total'  => &$total
		);

		$sort_order = array();
		$results = $this->model_setting_extension->getExtensions('total');

		foreach ($results as $key => $value) {
			$sort_order[$key] = $this->config->get('total_' . $value['code'] . '_sort_order');
		}

		array_multisort($sort_order, SORT_ASC, $results);

		foreach ($results as $result) {
			if ($this->config->get('total_' . $result['code'] . '_status')) {
				$this->load->model('extension/total/' . $result['code']);
				$this->{'model_extension_total_' . $result['code']}->getTotal($total_data);
			}
		}

		$sort_order = array();

		foreach ($totals as $key => $value) {
			$sort_order[$key] = $value['sort_order'];
		}

		array_multisort($sort_order, SORT_ASC, $totals);

		$data['totals'] = array();

		foreach ($totals as $total_row) {
			$data['totals'][] = array(
				'title' => $total_row['title'],
				'text'  => $this->currency->format($total_row['value'], $this->session->data['currency']),
				'code'  => $total_row['code']
			);
		}

		// Payment methods
		$data['payment_methods'] = array();

		$temp_payment_address = array(
			'country_id' => $this->config->get('config_country_id'),
			'zone_id'    => $this->config->get('config_zone_id')
		);

		$recurring = $this->cart->hasRecurringProducts();

		$results = $this->model_setting_extension->getExtensions('payment');

		foreach ($results as $result) {
			if ($this->config->get('payment_' . $result['code'] . '_status')) {
				$this->load->model('extension/payment/' . $result['code']);

				$method = $this->{'model_extension_payment_' . $result['code']}->getMethod($temp_payment_address, $total);

				if ($method) {
					if ($recurring) {
						if (property_exists($this->{'model_extension_payment_' . $result['code']}, 'recurringPayments') && $this->{'model_extension_payment_' . $result['code']}->recurringPayments()) {
							$data['payment_methods'][$result['code']] = $method;
						}
					} else {
						$data['payment_methods'][$result['code']] = $method;
					}
				}
			}
		}

		$sort_order = array();
		foreach ($data['payment_methods'] as $key => $value) {
			$sort_order[$key] = $value['sort_order'];
		}
		if ($sort_order) {
			array_multisort($sort_order, SORT_ASC, $data['payment_methods']);
		}

		// Terms & conditions
		if ($this->config->get('config_checkout_id')) {
			$this->load->model('catalog/information');

			$information_info = $this->model_catalog_information->getInformation($this->config->get('config_checkout_id'));

			if ($information_info) {
				$data['text_agree'] = sprintf($this->language->get('text_agree'), $this->url->link('information/information/agree', 'information_id=' . $this->config->get('config_checkout_id'), true), $information_info['title']);
			} else {
				$data['text_agree'] = '';
			}
		} else {
			$data['text_agree'] = '';
		}

		$data['content_bottom'] = $this->load->controller('common/content_bottom');
		$data['footer'] = $this->load->controller('common/footer');
		$data['header'] = $this->load->controller('common/header');

		$this->response->setOutput($this->load->view('checkout/checkout', $data));
	}

	public function totals() {
		$json = array();

		$totals = array();
		$taxes = $this->cart->getTaxes();
		$total = 0;

		$total_data = array(
			'totals' => &$totals,
			'taxes'  => &$taxes,
			'total'  => &$total
		);

		$this->load->model('setting/extension');

		$sort_order = array();
		$results = $this->model_setting_extension->getExtensions('total');

		foreach ($results as $key => $value) {
			$sort_order[$key] = $this->config->get('total_' . $value['code'] . '_sort_order');
		}

		array_multisort($sort_order, SORT_ASC, $results);

		foreach ($results as $result) {
			if ($this->config->get('total_' . $result['code'] . '_status')) {
				$this->load->model('extension/total/' . $result['code']);
				$this->{'model_extension_total_' . $result['code']}->getTotal($total_data);
			}
		}

		$sort_order = array();

		foreach ($totals as $key => $value) {
			$sort_order[$key] = $value['sort_order'];
		}

		array_multisort($sort_order, SORT_ASC, $totals);

		foreach ($totals as $total_row) {
			$json[] = array(
				'title' => $total_row['title'],
				'text'  => $this->currency->format($total_row['value'], $this->session->data['currency']),
				'code'  => $total_row['code']
			);
		}

		$this->response->addHeader('Content-Type: application/json');
		$this->response->setOutput(json_encode($json));
	}

	public function country() {
		$json = array();

		$this->load->model('localisation/country');

		$country_info = $this->model_localisation_country->getCountry($this->request->get['country_id']);

		if ($country_info) {
			$this->load->model('localisation/zone');

			$json = array(
				'country_id'        => $country_info['country_id'],
				'name'              => $country_info['name'],
				'iso_code_2'        => $country_info['iso_code_2'],
				'iso_code_3'        => $country_info['iso_code_3'],
				'address_format'    => $country_info['address_format'],
				'postcode_required' => $country_info['postcode_required'],
				'zone'              => $this->model_localisation_zone->getZonesByCountryId($this->request->get['country_id']),
				'status'            => $country_info['status']
			);
		}

		$this->response->addHeader('Content-Type: application/json');
		$this->response->setOutput(json_encode($json));
	}

	public function customfield() {
		$json = array();

		$this->load->model('account/custom_field');

		// Customer Group
		if (isset($this->request->get['customer_group_id']) && is_array($this->config->get('config_customer_group_display')) && in_array($this->request->get['customer_group_id'], $this->config->get('config_customer_group_display'))) {
			$customer_group_id = $this->request->get['customer_group_id'];
		} else {
			$customer_group_id = $this->config->get('config_customer_group_id');
		}

		$custom_fields = $this->model_account_custom_field->getCustomFields($customer_group_id);

		foreach ($custom_fields as $custom_field) {
			$json[] = array(
				'custom_field_id' => $custom_field['custom_field_id'],
				'required'        => $custom_field['required']
			);
		}

		$this->response->addHeader('Content-Type: application/json');
		$this->response->setOutput(json_encode($json));
	}
}