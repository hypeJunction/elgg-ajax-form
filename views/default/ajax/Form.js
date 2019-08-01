define(function (require) {

	var elgg = require('elgg');
	var $ = require('jquery');
	var Ajax = require('elgg/Ajax');
	var spinner = require('elgg/spinner');

	var Deferrable = function (selector) {

		var that = this;

		this.$el = $(selector);

		this.beforeCallbacks = [];
		this.successCallbacks = [];
		this.errorCallbacks = [];

		this.awaiting = false;

		this.onSubmit = function (callback) {
			that.beforeCallbacks.push(callback);
		};

		this.onSuccess = function (callback) {
			that.successCallbacks.push(callback);
		};

		this.onError = function (callback) {
			that.errorCallbacks.push(callback);
		};

		this.disable = function () {
			that.$el.find('[type="submit"]').prop('disabled', true);
		};

		this.enable = function () {
			that.$el.find('[type="submit"]').prop('disabled', false);
		};

		this.submit = function (e) {
			if (that.awaiting) {
				return;
			}

			e.preventDefault();

			var $form = that.$el;

			that.disable();
			that.awaiting = true;

			var deffereds = [];
			that.beforeCallbacks.map(function (callback) {
				var $d = $.Deferred();
				callback($d.resolve, $d.reject);
				deffereds.push($d.promise());
			});

			var $submitted = $.Deferred();
			$.when.apply($, deffereds)
				.done(function () {
					var ajax = new Ajax();

					var data = new FormData($form[0]);

					data.append('__elgg_ts', elgg.security.token.__elgg_ts);
					data.append('__elgg_token', elgg.security.token.__elgg_token);

					$.ajax({
						url: $form.attr('action'),
						data: data,
						cache: false,
						processData: false,
						contentType: false,
						type: 'POST',
						beforeSend: function () {
							spinner.start();
						},
					}).done(function (data, statusText, xhr) {
						var m = data.system_messages;

						if (m && m.error) {
							elgg.register_error(m.error);
							data.status = -1;
						} else {
							data.status = 0;
						}

						m && m.success && elgg.system_message(m.success);

						if (data.status === -1) {
							$submitted.reject(statusText, xhr);
						} else {
							$submitted.resolve(data, statusText, xhr);
						}
					}).fail($submitted.reject).always(function () {
						spinner.stop();
					});
				})
				.fail($submitted.reject);

			$.when($submitted)
				.done(function (data, statusText, xhr) {
					if (that.successCallbacks.length) {
						that.awaiting = false;

						for (var i in that.successCallbacks) {
							that.successCallbacks[i].apply(that, data, statusText, xhr);
						}
					} else {
						$('body').trigger('click'); // hide all popups and lightboxes
						spinner.start();

						if (data.output && data.output.forward_url) {
							location.href = data.output.forward_url;
						} else {
							location.href = data.forward_url || elgg.normalize_url('');
						}
					}
				})
				.fail(function (statusText, xhr) {
					if (that.errorCallbacks.length) {
						for (var i in that.errorCallbacks) {
							that.errorCallbacks[i].apply(that, statusText, xhr);
						}
					}

					that.awaiting = false;
					that.enable();
				});

			return false;
		};

		this.$el.off('submit').on('submit', this.submit);
	};

	return function (selector) {
		if (!$(selector).data('Deferrable')) {
			$(selector).data('Deferrable', new Deferrable(selector));
		}

		this.Deferrable = $(selector).data('Deferrable');

		this.onSubmit = this.Deferrable.onSubmit;
		this.onSuccess = this.Deferrable.onSuccess;
		this.onError = this.Deferrable.onError;
	};
});